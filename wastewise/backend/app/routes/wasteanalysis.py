"""
Extended Object Detection and Weight Estimation Pipeline

Guideline for anyone looking into this, our script demonstrates a complete pipeline that:
    1. Calibrates the pixel-to-cm conversion factor from a calibration CSV.
    2. Loads a YOLOv5 model to detect objects in images/video.
    3. Extracts bounding box dimensions and converts them to physical units.
    4. Estimates weight using:
         a. A physics-based cylindrical volume formula with density per class.
         b. Optionally, a PyTorch regression model trained on extracted features.
    5. Supports batch processing of images or video frames.
    6. Logs and visualises results via CSV and histogram plots.
    7. (Optional) Trains a simple regression model for weight prediction using provided training data.
    
Usage Examples:
    python extended_pipeline.py --image_path ./data/sample.jpg --calib_csv ./calibration.csv --output_dir ./output --model_variant yolov5s --display
    python extended_pipeline.py --video_path ./data/sample_video.mp4 --output_dir ./output --model_variant yolov5m
    python extended_pipeline.py --train_regression_csv ./train_features.csv --output_dir ./output --train_regression True
"""

import torch
import cv2
import numpy as np
import math
import pandas as pd
import argparse
import os
import datetime
import matplotlib.pyplot as plt
import logging
from sklearn.linear_model import LinearRegression
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter

# -------------------------------
# Global Defaults & Calibration Settings
# -------------------------------
DEFAULT_PIXELS_PER_CM = 10.0  # fallback conversion factor if calibration data not provided

# Example density values in g/cm^3 for various classes (placeholders)
DENSITY_DICT = {
    "Plastic": 0.92,
    "Paper": 0.80,
    "Metal": 7.80,
    "Trash": 1.20,
    "Default": 1.0
}

# Correction factor to adjust for shape approximation errors
CORRECTION_FACTOR = 0.95

# -------------------------------
# Logging Configuration
# -------------------------------
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=[logging.StreamHandler()])

logger = logging.getLogger(__name__)

# -------------------------------
# Calibration Functions
# -------------------------------
def calibrate_pixels_to_cm(calib_csv):
    """
    Calibrate the pixels-to-cm conversion factor from a CSV file.
    
    The CSV file should have columns: 'pixel_measurement' and 'actual_cm'.
    Returns the conversion factor (pixels per cm) based on linear regression.
    """
    logger.info(f"Reading calibration data from {calib_csv}")
    df = pd.read_csv(calib_csv)
    if 'pixel_measurement' not in df.columns or 'actual_cm' not in df.columns:
        raise ValueError("Calibration CSV must contain 'pixel_measurement' and 'actual_cm' columns.")
    X = df[['pixel_measurement']].values  # measured in pixels
    y = df['actual_cm'].values            # measured in cm
    
    reg = LinearRegression()
    reg.fit(X, y)
    slope = reg.coef_[0]      # cm per pixel
    intercept = reg.intercept_
    logger.info(f"Calibration complete: Slope = {slope:.4f} cm/pixel, Intercept = {intercept:.4f} cm")
    # Conversion factor (pixels per cm) is the reciprocal of slope
    conv_factor = 1.0 / slope if slope != 0 else DEFAULT_PIXELS_PER_CM
    return conv_factor, intercept

# -------------------------------
# Regression Model for Weight Estimation (Optional)
# -------------------------------
class WeightRegressor(nn.Module):
    """
    A simple feed-forward neural network to predict weight
    from extracted features (e.g., width, height, area).
    """
    def __init__(self, input_dim=3, hidden_dim=16, output_dim=1):
        super(WeightRegressor, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.ReLU(),
            nn.Linear(hidden_dim * 2, output_dim)
        )
    
    def forward(self, x):
        return self.model(x)

def train_regression_model(train_csv, num_epochs=100, learning_rate=0.001):
    """
    Train the regression model on provided training data CSV.
    
    The CSV should have feature columns (e.g., 'width_cm', 'height_cm', 'area_cm2')
    and a target column 'actual_weight_g'.
    
    Returns the trained model.
    """
    logger.info(f"Loading regression training data from {train_csv}")
    df = pd.read_csv(train_csv)
    if not all(col in df.columns for col in ['width_cm', 'height_cm', 'area_cm2', 'actual_weight_g']):
        raise ValueError("Training CSV must have 'width_cm', 'height_cm', 'area_cm2', and 'actual_weight_g' columns.")
    
    # Use features: width_cm, height_cm, and computed area_cm2
    X = df[['width_cm', 'height_cm', 'area_cm2']].values.astype(np.float32)
    y = df['actual_weight_g'].values.astype(np.float32).reshape(-1, 1)
    
    # Convert to PyTorch tensors
    X_tensor = torch.tensor(X)
    y_tensor = torch.tensor(y)
    
    model = WeightRegressor(input_dim=3)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    writer = SummaryWriter(comment="WeightRegression")
    
    logger.info("Starting regression training...")
    for epoch in range(num_epochs):
        model.train()
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()
        
        writer.add_scalar("Loss/train", loss.item(), epoch)
        if (epoch + 1) % 10 == 0:
            logger.info(f"Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}")
    writer.close()
    logger.info("Regression training complete.")
    return model

def regression_predict(model, features):
    """
    Use the trained regression model to predict weight.
    
    :param model: Trained WeightRegressor model.
    :param features: numpy array of features (shape: [N, 3]).
    :return: numpy array of predicted weights.
    """
    model.eval()
    with torch.no_grad():
        X_tensor = torch.tensor(features.astype(np.float32))
        predictions = model(X_tensor)
    return predictions.numpy().flatten()

# -------------------------------
# Weight Estimation Functions (Formula-based)
# -------------------------------
def formula_estimate_weight(pixel_width, pixel_height, conversion_factor=DEFAULT_PIXELS_PER_CM):
    """
    Estimate weight using a cylindrical volume approximation.
    
    Converts pixel dimensions to cm and calculates:
        width_cm = pixel_width / conversion_factor,
        height_cm = pixel_height / conversion_factor,
        volume_cm3 = π * (width_cm/2)^2 * height_cm.
    
    Weight (g) = volume_cm3 * density * CORRECTION_FACTOR.
    Here density is assumed to be 1.0 for formula-based estimation.
    """
    width_cm = pixel_width / conversion_factor
    height_cm = pixel_height / conversion_factor
    radius_cm = width_cm / 2.0
    volume_cm3 = math.pi * (radius_cm ** 2) * height_cm
    # Use a default density of 1.0 g/cm^3 for formula-based estimation
    weight = volume_cm3 * DENSITY_DICT.get("Default", 1.0) * CORRECTION_FACTOR
    return weight

def refined_estimate_weight(pixel_width, pixel_height, label, conversion_factor=DEFAULT_PIXELS_PER_CM):
    """
    Estimate weight using object-specific density values.
    
    Converts pixel dimensions to cm and calculates cylindrical volume.
    Uses density from DENSITY_DICT for the given label.
    """
    width_cm = pixel_width / conversion_factor
    height_cm = pixel_height / conversion_factor
    radius_cm = width_cm / 2.0
    volume_cm3 = math.pi * (radius_cm ** 2) * height_cm
    density = DENSITY_DICT.get(label, DENSITY_DICT["Default"])
    weight = volume_cm3 * density * CORRECTION_FACTOR
    return weight

# -------------------------------
# Image/Video Processing & Detection
# -------------------------------
def process_image(image_path, model, conversion_factor=DEFAULT_PIXELS_PER_CM, use_regressor=False, regressor_model=None):
    """
    Process a single image: run YOLOv5 detection, extract bounding boxes,
    convert to physical dimensions, and estimate weight using both the formula
    and (optionally) a regression model.
    
    :param image_path: Path to input image.
    :param model: YOLOv5 model.
    :param conversion_factor: Pixels per cm conversion factor.
    :param use_regressor: Boolean flag to use regression model for weight estimation.
    :param regressor_model: Trained regression model.
    :return: Annotated image and list of detection info dictionaries.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Unable to load image: {image_path}")
    annotated_img = img.copy()
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Run inference on the image using YOLOv5
    results = model(img_rgb, size=640)
    detections = results.xyxy[0].cpu().numpy()  # shape: [N, 6]
    
    detection_data = []
    features_for_reg = []  # For regression model: [width_cm, height_cm, area_cm2]
    
    for det in detections:
        x1, y1, x2, y2, conf, cls = det
        pixel_width = x2 - x1
        pixel_height = y2 - y1
        label = results.names[int(cls)]
        
        # Estimate weight using formula with class-specific density
        weight_formula = refined_estimate_weight(pixel_width, pixel_height, label, conversion_factor)
        # Also compute a basic formula weight for reference
        weight_basic = formula_estimate_weight(pixel_width, pixel_height, conversion_factor)
        
        # Compute physical dimensions (cm)
        width_cm = pixel_width / conversion_factor
        height_cm = pixel_height / conversion_factor
        area_cm2 = width_cm * height_cm
        
        # Optionally, predict weight using regression model
        weight_reg = None
        if use_regressor and regressor_model is not None:
            feature_vec = np.array([width_cm, height_cm, area_cm2]).reshape(1, -1)
            weight_reg = regression_predict(regressor_model, feature_vec)[0]
        
        # Save detection information
        det_info = {
            "label": label,
            "confidence": conf,
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "pixel_width": pixel_width, "pixel_height": pixel_height,
            "width_cm": width_cm, "height_cm": height_cm, "area_cm2": area_cm2,
            "weight_formula_g": weight_formula,
            "weight_basic_g": weight_basic,
            "weight_regression_g": weight_reg,
            "density_used": DENSITY_DICT.get(label, DENSITY_DICT["Default"])
        }
        detection_data.append(det_info)
        
        # Annotate image
        box_color = (0, 255, 0)
        cv2.rectangle(annotated_img, (int(x1), int(y1)), (int(x2), int(y2)), box_color, 2)
        text = f"{label}: {weight_formula:.1f}g"
        if weight_reg is not None:
            text += f" ({weight_reg:.1f}g)"
        cv2.putText(annotated_img, text, (int(x1), int(y1)-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)
        
        features_for_reg.append([width_cm, height_cm, area_cm2])
    
    return annotated_img, detection_data

def process_video(video_path, model, conversion_factor=DEFAULT_PIXELS_PER_CM, output_video="output_video.avi", use_regressor=False, regressor_model=None):
    """
    Process a video file frame by frame to detect objects and estimate weight.
    
    :param video_path: Path to the input video.
    :param model: YOLOv5 model.
    :param conversion_factor: Pixels per cm conversion factor.
    :param output_video: Path to save the annotated output video.
    :param use_regressor: Flag to use regression model.
    :param regressor_model: Trained regression model.
    :return: None.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")
    
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))
    
    frame_idx = 0
    all_detections = []
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert frame from BGR to RGB for YOLOv5
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = model(frame_rgb, size=640)
        detections = results.xyxy[0].cpu().numpy()
        
        for det in detections:
            x1, y1, x2, y2, conf, cls = det
            pixel_width = x2 - x1
            pixel_height = y2 - y1
            label = results.names[int(cls)]
            
            weight_est = refined_estimate_weight(pixel_width, pixel_height, label, conversion_factor)
            # Annotate frame
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
            cv2.putText(frame, f"{label}: {weight_est:.1f}g", (int(x1), int(y1)-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
            
            # Log detection for current frame
            all_detections.append({
                "frame": frame_idx,
                "label": label,
                "confidence": conf,
                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                "pixel_width": pixel_width, "pixel_height": pixel_height,
                "weight_est_g": weight_est
            })
        
        out.write(frame)
        frame_idx += 1
        
        if args.display:
            cv2.imshow("Video Detection", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    
    # Save video detections log
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_csv = os.path.join(os.path.dirname(output_video), f"video_detections_{timestamp}.csv")
    pd.DataFrame(all_detections).to_csv(log_csv, index=False)
    logger.info(f"Video detection log saved to {log_csv}")

# -------------------------------
# Reporting and Visualization Functions
# -------------------------------
def plot_weight_histogram(detections, output_dir, filename="weight_histogram.png"):
    """
    Plot and save a histogram of the estimated weights from detections.
    """
    weights = [d["weight_formula_g"] for d in detections if d["weight_formula_g"] is not None]
    plt.figure(figsize=(10, 6))
    plt.hist(weights, bins=20, color='skyblue', edgecolor='black')
    plt.title("Histogram of Estimated Weights")
    plt.xlabel("Weight (g)")
    plt.ylabel("Frequency")
    plot_path = os.path.join(output_dir, filename)
    plt.savefig(plot_path)
    plt.close()
    logger.info(f"Histogram saved to {plot_path}")

def generate_summary_report(detections, output_dir, filename="summary_report.txt"):
    """
    Generate a summary report of the detection statistics and weight estimates.
    """
    if not detections:
        logger.warning("No detections to report.")
        return
    df = pd.DataFrame(detections)
    summary = []
    summary.append("Weight Estimation Summary Report")
    summary.append(f"Total Detections: {len(detections)}")
    summary.append(f"Average Estimated Weight: {df['weight_formula_g'].mean():.2f} g")
    summary.append(f"Minimum Estimated Weight: {df['weight_formula_g'].min():.2f} g")
    summary.append(f"Maximum Estimated Weight: {df['weight_formula_g'].max():.2f} g")
    summary.append("\nDetection Counts by Class:")
    class_counts = df['label'].value_counts()
    for label, count in class_counts.items():
        summary.append(f"  {label}: {count}")
    
    report_text = "\n".join(summary)
    report_path = os.path.join(output_dir, filename)
    with open(report_path, "w") as f:
        f.write(report_text)
    logger.info(f"Summary report saved to {report_path}")

# -------------------------------
# Main Pipeline Execution
# -------------------------------
def main(args):
    # Create output directory if needed
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
    
    # Calibration: compute conversion factor from CSV if provided
    if args.calib_csv:
        conversion_factor, intercept = calibrate_pixels_to_cm(args.calib_csv)
    else:
        conversion_factor = DEFAULT_PIXELS_PER_CM
        logger.info(f"Using default conversion factor: {conversion_factor} pixels per cm")
    
    # Load YOLOv5 model from PyTorch Hub
    logger.info(f"Loading YOLOv5 model variant '{args.model_variant}'...")
    model = torch.hub.load('ultralytics/yolov5', args.model_variant, pretrained=True)
    model.conf = args.confidence
    model.iou = args.iou_threshold
    
    # If regression training is requested, train the regression model
    regressor_model = None
    if args.train_regression:
        if args.train_reg_csv is None:
            logger.error("Regression training requested but no training CSV provided.")
        else:
            regressor_model = train_regression_model(args.train_reg_csv, num_epochs=args.reg_epochs, learning_rate=args.reg_lr)
    
    # Process input: image, directory, or video
    all_detection_data = []
    if args.image_path:
        logger.info(f"Processing image: {args.image_path}")
        annotated_img, detections = process_image(args.image_path, model, conversion_factor, args.use_regressor, regressor_model)
        output_img_path = os.path.join(args.output_dir, f"annotated_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
        cv2.imwrite(output_img_path, annotated_img)
        logger.info(f"Annotated image saved to {output_img_path}")
        all_detection_data.extend(detections)
    elif args.images_dir:
        logger.info(f"Processing image directory: {args.images_dir}")
        for filename in os.listdir(args.images_dir):
            if filename.lower().endswith(('.jpg', '.png', '.jpeg')):
                img_path = os.path.join(args.images_dir, filename)
                annotated_img, detections = process_image(img_path, model, conversion_factor, args.use_regressor, regressor_model)
                output_img_path = os.path.join(args.output_dir, f"annotated_{filename}")
                cv2.imwrite(output_img_path, annotated_img)
                logger.info(f"Processed and saved: {output_img_path}")
                all_detection_data.extend(detections)
    elif args.video_path:
        logger.info(f"Processing video: {args.video_path}")
        out_video_path = os.path.join(args.output_dir, f"annotated_video_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.avi")
        process_video(args.video_path, model, conversion_factor, output_video=out_video_path, use_regressor=args.use_regressor, regressor_model=regressor_model)
    else:
        logger.error("No input provided. Please specify --image_path, --images_dir, or --video_path.")
        return
    
    # Save detection data to CSV
    if all_detection_data:
        csv_path = os.path.join(args.output_dir, f"detections_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        pd.DataFrame(all_detection_data).to_csv(csv_path, index=False)
        logger.info(f"Detections logged to CSV: {csv_path}")
        
        # Generate summary report
        generate_summary_report(all_detection_data, args.output_dir)
        
        # Plot weight histogram
        plot_weight_histogram(all_detection_data, args.output_dir)
    else:
        logger.warning("No detections found; skipping logging and plotting.")

    # Optionally display one of the annotated images if --display is used and image mode was used
    if args.display and args.image_path:
        cv2.imshow("Annotated Image", annotated_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

# -------------------------------
# Argument Parsing
# -------------------------------
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Extended YOLOv5 Object Detection and Weight Estimation Pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--image_path', type=str, help="Path to input image")
    group.add_argument('--images_dir', type=str, help="Directory containing input images")
    group.add_argument('--video_path', type=str, help="Path to input video file")
    
    parser.add_argument('--calib_csv', type=str, default=None, help="Optional calibration CSV file")
    parser.add_argument('--model_variant', type=str, default="yolov5s", help="YOLOv5 model variant (e.g., yolov5s, yolov5m, yolov5l)")
    parser.add_argument('--confidence', type=float, default=0.5, help="Confidence threshold for YOLO detections")
    parser.add_argument('--iou_threshold', type=float, default=0.45, help="IoU threshold for NMS")
    parser.add_argument('--output_dir', type=str, default="output", help="Directory to save outputs (images, CSV, plots)")
    parser.add_argument('--display', action='store_true', help="Display annotated image/video frames")
    
    # Regression model training options
    parser.add_argument('--train_regression', action='store_true', help="Flag to train a regression model for weight estimation")
    parser.add_argument('--train_reg_csv', type=str, default=None, help="CSV file for regression training (features and actual weights)")
    parser.add_argument('--reg_epochs', type=int, default=100, help="Number of epochs for regression training")
    parser.add_argument('--reg_lr', type=float, default=0.001, help="Learning rate for regression training")
    parser.add_argument('--use_regressor', action='store_true', help="Use a trained regression model for weight prediction")
    
    args = parser.parse_args()
    main(args)
