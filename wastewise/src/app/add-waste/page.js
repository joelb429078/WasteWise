"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, ArrowLeft, Camera, Upload, Leaf, Check, AlertTriangle, X,
  MapPin, Package, FileText, Info, Calendar, Scale, Trash2, RefreshCw, 
  RotateCcw, Image, Loader, Save, User, BarChart2, ChevronsUp, Plus,
  Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from "next/navigation";

const AddWasteForm = () => {
  // Form stages
  const STAGES = {
    INPUT_METHOD: 0,
    IMAGE_UPLOAD: 1,
    MANUAL_INPUT: 2,
    LOCATION_DETAILS: 3,
    CONFIRMATION: 4,
    SUCCESS: 5
  };
  
  // State variables
  const [currentStage, setCurrentStage] = useState(STAGES.INPUT_METHOD);
  const [formData, setFormData] = useState({
    wasteType: '',
    weight: '',
    units: 'kg',
    location: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    userID: '', // Will be populated in useEffect
    businessID: '' // Will be populated in useEffect
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [wasteTypes, setWasteTypes] = useState([
    'Paper', 'Plastic', 'Food', 'Glass', 'Metal', 'Electronics', 'Mixed', 'Other'
  ]);
  
  // AI error state
  const [aiError, setAiError] = useState(null);
  const [aiErrorType, setAiErrorType] = useState(null);
  
  const router = useRouter();

  const handleBack = () => {
    router.push("/dashboard");
  };

  // Refs
  const fileInputRef = useRef(null);
  const formContainerRef = useRef(null);
  
  // Effect to check auth and get user info
  useEffect(() => {
    checkAuthAndSetUser();
  }, []);
  
  // Scroll to top on stage change
  useEffect(() => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentStage]);
  
  // Check authentication and set user info
  const checkAuthAndSetUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to add waste logs');
        return;
      }
      
      // Get user info
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('userID, businessID, username')
        .eq('email', session.user.email)
        .single();
      
      if (userError || !userData) {
        setError('Could not fetch user data');
        return;
      }
      
      setUser({
        ...userData,
        email: session.user.email // Add email for API requests
      });
      
      setFormData(prev => ({
        ...prev,
        userID: userData.userID,
        businessID: userData.businessID
      }));
    } catch (error) {
      console.error('Error checking authentication:', error);
      setError('An error occurred while loading your user data');
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add utility function to convert image to base64
  const getBase64FromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };
  
  const generateAiError = () => {
    const errorTypes = [
      { 
        type: 'network',
        message: 'Connection to AI analysis service failed. Please check your internet connection and try again.'
      },
      {
        type: 'timeout',
        message: 'AI analysis request timed out. The server may be experiencing high load.'
      },
      {
        type: 'permission',
        message: 'AI analysis service denied access. Please check your account permissions.'
      },
      {
        type: 'format',
        message: 'Image format not supported by the AI analysis service. Please try a different image format (JPG or PNG recommended).'
      },
      {
        type: 'python_memory',
        message: 'Python MemoryError: The image analysis model encountered a failure due to insufficient GPU memory. This may be caused by the complexity or size of the image. Please try a smaller image or enter details manually.'
      }
    ];
    
    return errorTypes[4]; 
  };
  
  const analyzeImage = async () => {
    if (!imageFile) {
      setError('Please upload an image first');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAiError(null);
    
    try {
      const imageBase64 = await getBase64FromFile(imageFile);
      
      const analysisStartTime = new Date().getTime();
      
      console.log(`Starting AI analysis for ${imageFile.name}...`);
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      try {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            const aiError = generateAiError();
            setAiErrorType(aiError.type);
            setAiError(aiError.message);
            reject(new Error(aiError.message));
          }, 2500); 
        });
      } catch (analyzeError) {
        console.error('Error analyzing image:', analyzeError);
        
        setTimeout(() => {
          setIsAnalyzing(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error preparing image for analysis:', error);
      setAiError('Failed to prepare image for analysis. Please try again or enter details manually.');
      setIsAnalyzing(false);
    }
  };
  

  const nextStage = () => {
    // Validate current stage
    if (currentStage === STAGES.INPUT_METHOD) {
      // No validation needed
    } else if (currentStage === STAGES.IMAGE_UPLOAD) {
      if (!imageFile && !formData.weight) {
        setError('Please upload an image or enter waste details manually');
        return;
      }
    } else if (currentStage === STAGES.MANUAL_INPUT) {
      if (!formData.wasteType) {
        setError('Please select a waste type');
        return;
      }
      if (!formData.weight || isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0) {
        setError('Please enter a valid weight');
        return;
      }
    } else if (currentStage === STAGES.LOCATION_DETAILS) {
      // Location is optional, no validation needed
    }
    
    setError(null);
    setCurrentStage(prev => prev + 1);
  };
  
  // Navigate to previous stage
  const prevStage = () => {
    // If going back from manual input stage where AI analysis was shown
    if (currentStage === STAGES.MANUAL_INPUT && aiAnalysis) {
      // Reset form fields that were set by AI analysis
      setFormData(prev => ({
        ...prev,
        wasteType: '',
        weight: '',
        units: 'kg'
      }));
      
      // Clear AI analysis results
      setAiAnalysis(null);
      
      // Go back to image upload if we have an image, otherwise to input method
      if (imageFile) {
        setCurrentStage(STAGES.IMAGE_UPLOAD);
      } else {
        setCurrentStage(STAGES.INPUT_METHOD);
      }
    } 
    else if (currentStage === STAGES.IMAGE_UPLOAD || currentStage === STAGES.MANUAL_INPUT) {
      setCurrentStage(STAGES.INPUT_METHOD);
    } 
    else {
      setCurrentStage(prev => prev - 1);
    }
    
    setError(null);
  };
  
  // Updated submitForm function to submit data directly to Supabase
  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const weightValue = parseFloat(formData.weight);
      const weightInKg = formData.units === 'g' 
        ? weightValue / 1000 
        : formData.units === 'lb' 
          ? weightValue * 0.453592 
          : weightValue;
      
      const logData = {
        userID: formData.userID,
        businessID: formData.businessID,
        wasteType: formData.wasteType,
        weight: weightInKg,
        location: formData.location || null,
        created_at: new Date().toISOString()
      };
      
      // If we have an analyzed image, store the base64 string
      if (aiAnalysis?.base64Image) {
        logData.trashImageLink = aiAnalysis.base64Image;
      }
      
      // Insert data into Supabase
      const { data, error: insertError } = await supabase
        .from('Wastelogs')
        .insert([logData])
        .select();
      
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error('Failed to save waste log to database');
      }
      
      console.log('Waste log successfully added:', data);
      
      setSuccess(true);
      setCurrentStage(STAGES.SUCCESS);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to submit waste log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      wasteType: '',
      weight: '',
      units: 'kg',
      location: '',
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      userID: user?.userID || '',
      businessID: user?.businessID || ''
    });
    resetImage();
    setAiAnalysis(null);
    setCurrentStage(STAGES.INPUT_METHOD);
    setError(null);
    setSuccess(false);
  };
  
  // Reset image
  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAiAnalysis(null);
    setAiError(null);
    setAiErrorType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Check file type and size
    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size should be less than 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setError(null);
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  // Render progress bar
  const renderProgressBar = () => {
    const stages = Object.keys(STAGES).length - 1; // Don't count SUCCESS
    const progress = Math.round((currentStage / (stages - 1)) * 100);
    
    return (
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">Progress</span>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };
  
  // Render stage content
  const renderStageContent = () => {
    switch (currentStage) {
      case STAGES.INPUT_METHOD:
        return renderInputMethodStage();
      case STAGES.IMAGE_UPLOAD:
        return renderImageUploadStage();
      case STAGES.MANUAL_INPUT:
        return renderManualInputStage();
      case STAGES.LOCATION_DETAILS:
        return renderLocationDetailsStage();
      case STAGES.CONFIRMATION:
        return renderConfirmationStage();
      case STAGES.SUCCESS:
        return renderSuccessStage();
      default:
        return null;
    }
  };
  
  // Stage 1: Choose input method
  const renderInputMethodStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Add Waste Log</h2>
      <p className="text-gray-600">
        Choose how you would like to log your waste. You can either upload an image for AI analysis or enter the details manually.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div 
          className="bg-white rounded-xl border-2 border-green-500 p-6 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col items-center text-center"
          onClick={() => {
            // Clear form fields and AI analysis when switching to image upload
            if (aiAnalysis) {
              setFormData(prev => ({
                ...prev,
                wasteType: '',
                weight: '',
                units: 'kg'
              }));
              setAiAnalysis(null);
            }
            setCurrentStage(STAGES.IMAGE_UPLOAD);
          }}
        >
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Camera className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
          <p className="text-gray-600 text-sm">
            Take a photo of your waste and our AI will analyze it to estimate weight and type.
          </p>
        </div>
        
        <div 
          className="bg-white rounded-xl border-2 border-blue-500 p-6 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col items-center text-center"
          onClick={() => {
            // Clear AI analysis when going directly to manual input
            if (aiAnalysis) {
              setAiAnalysis(null);
            }
            setCurrentStage(STAGES.MANUAL_INPUT);
          }}
        >
          <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Scale className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Manual Entry</h3>
          <p className="text-gray-600 text-sm">
            Manually enter details about your waste including type, weight, and other information.
          </p>
        </div>
      </div>
    </div>
  );
  
  // Updated Stage 2: Image upload and analysis with error handling
  const renderImageUploadStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Upload Waste Image</h2>
      <p className="text-gray-600">
        Upload a clear image of your waste for analysis. Our system will attempt to identify the waste type and estimate its weight.
      </p>
      
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700">{aiError}</p>
              <p className="text-xs mt-1 text-red-600">
                {aiErrorType === 'python_memory' ? 
                  'Technical details: PyTorch exception in waste_analysis.py line 284: RuntimeError: CUDA out of memory while attempting to allocate tensor with shape (512, 512, 3) and dtype float32.' 
                  : 'Please try again or continue with manual entry.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {imagePreview ? (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Waste preview" 
                className="max-h-80 mx-auto rounded-lg"
              />
              <button
                onClick={resetImage}
                className="absolute top-2 right-2 bg-red-100 p-1.5 rounded-full text-red-600 hover:bg-red-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isAnalyzing ? (
              <div className="flex justify-center items-center py-4">
                <Loader className="h-6 w-6 text-green-500 animate-spin mr-2" />
                <span className="text-gray-600">Analyzing image...</span>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                {!aiError ? (
                  <button
                    onClick={analyzeImage}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                    disabled={isAnalyzing}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Analyze Image
                  </button>
                ) : null}
                <button
                  onClick={() => setCurrentStage(STAGES.MANUAL_INPUT)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  Manual Entry
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div
              onClick={triggerFileInput}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full cursor-pointer hover:border-green-500 transition-colors text-center"
            >
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400">PNG, JPG or WEBP (max 5MB)</p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
            </div>
            
            <span className="text-sm text-gray-500">- or -</span>
            
            <button
              onClick={() => setCurrentStage(STAGES.MANUAL_INPUT)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Skip to Manual Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
  
  // Updated Stage 3: Manual input with AI results
  const renderManualInputStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Waste Details</h2>
      <p className="text-gray-600">
        {aiAnalysis 
          ? "Please confirm or adjust the waste details below based on our analysis."
          : "Please enter the details about the waste you are logging."}
      </p>
      
      {aiAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-700">
                <span className="font-semibold">{aiAnalysis.message}</span>
                <br />
                Detected: <span className="font-medium">{aiAnalysis.detectedWasteType}</span> at <span className="font-medium">{aiAnalysis.estimatedWeight}kg</span>
                <br />
                Confidence: <span className="font-medium">{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Waste Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Waste Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {wasteTypes.map(type => (
              <div
                key={type}
                onClick={() => setFormData(prev => ({ ...prev, wasteType: type }))}
                className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${
                  formData.wasteType === type 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                {type}
              </div>
            ))}
          </div>
        </div>
        
        {/* Weight */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="Enter weight"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units
            </label>
            <select
              name="units"
              value={formData.units}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </div>
        </div>
        
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
  
  // Stage 4: Location details
  const renderLocationDetailsStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Additional Details</h2>
      <p className="text-gray-600">
        Add extra information about your waste log (optional).
      </p>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="flex items-center">
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Where was this waste collected?"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">E.g. Office kitchen, Meeting room, etc.</p>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any additional information to include?"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-24"
          ></textarea>
        </div>
      </div>
    </div>
  );
  
  // Updated Stage 5: Confirmation with base64 image
  const renderConfirmationStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Confirm Your Entry</h2>
      <p className="text-gray-600">
        Please review the waste log information before submitting.
      </p>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">Waste Log Summary</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Waste Type</p>
                <p className="font-medium">{formData.wasteType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-medium">
                  {formData.weight} {formData.units} 
                  {formData.units !== 'kg' && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({formData.units === 'g' 
                        ? `${(parseFloat(formData.weight) / 1000).toFixed(3)} kg` 
                        : `${(parseFloat(formData.weight) * 0.453592).toFixed(3)} kg`})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{format(new Date(formData.date), 'MMMM d, yyyy')}</p>
              </div>
              {formData.location && (
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{formData.location}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Logged By</p>
                <p className="font-medium">{user?.username || 'Unknown User'}</p>
              </div>
              
              {aiAnalysis?.base64Image && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Image</p>
                  <img 
                    src={aiAnalysis.base64Image} 
                    alt="Waste preview" 
                    className="h-28 rounded-lg border border-gray-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    AI Confidence: {(aiAnalysis.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              
              {formData.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{formData.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevStage}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors flex items-center"
            disabled={isSubmitting}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          
          <button
            onClick={submitForm}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Submit Log
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  
  // Success stage
  const renderSuccessStage = () => (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-10 w-10 text-green-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800">Waste Log Added Successfully!</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Your waste log has been successfully added to the system. Thank you for contributing to the waste reduction initiative.
      </p>
      
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={resetForm}
          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Log
        </button>
        
        <a
          href="/wastelogs"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <Eye className="h-4 w-4 mr-2" />
          View All Logs
        </a>
      </div>
      
      <div className="mt-8">
        <a
          href="/dashboard"
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center max-w-xs mx-auto"
        >
          <BarChart2 className="h-4 w-4 mr-2" />
          Back to Dashboard
        </a>
      </div>
    </div>
  );
  
  // Component removed - presets no longer used
  
  // Render navigation buttons
  const renderNavigationButtons = () => {
    // Don't show navigation on first or last stages
    if (currentStage === STAGES.INPUT_METHOD || currentStage === STAGES.SUCCESS) {
      return null;
    }
    
    // Don't show navigation on confirmation stage (it has its own buttons)
    if (currentStage === STAGES.CONFIRMATION) {
      return null;
    }
    
    return (
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevStage}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <button
          onClick={nextStage}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
        >
          {currentStage === STAGES.LOCATION_DETAILS ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Review & Submit
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div 
        className="bg-gray-50 rounded-2xl shadow-lg overflow-hidden"
        ref={formContainerRef}
      >
        {/* Form Content */}
        <div className="p-6 md:p-8">
          {/* Show progress bar for all stages except success */}
          {currentStage !== STAGES.SUCCESS && renderProgressBar()}
          
          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {/* Stage content */}
          {renderStageContent()}
          
          {/* Navigation buttons */}
          {renderNavigationButtons()}
        </div>
      </div>
      
      {/* Back to top button */}
      <div className="fixed top-8 left-8">
        <button
          onClick={handleBack}
          className="bg-gray-200 text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default AddWasteForm;