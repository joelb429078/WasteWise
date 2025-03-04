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
      
      setUser(userData);
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
  
  // Reset image
  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAiAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle AI analysis (placeholder for future implementation)
  const analyzeImage = async () => {
    if (!imageFile) {
      setError('Please upload an image first');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // This is a placeholder for your future AI implementation
      // In a real implementation, you would:
      // 1. Upload the image to your server or AI service
      // 2. Get back the analysis results
      // 3. Update the form with those results
      
      setAiAnalysis({
        message: "AI Analysis feature coming soon! For now, please enter waste details manually.",
        estimatedWeight: null,
        detectedWasteType: null,
        confidence: null
      });
      
      // Move to manual input stage to let user confirm or adjust
      setCurrentStage(STAGES.MANUAL_INPUT);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError('Failed to analyze the image. Please try again or enter details manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Navigate to next stage
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
    if (currentStage === STAGES.IMAGE_UPLOAD || currentStage === STAGES.MANUAL_INPUT) {
      setCurrentStage(STAGES.INPUT_METHOD);
    } else {
      setCurrentStage(prev => prev - 1);
    }
    setError(null);
  };
  
  // Submit the form
  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert weight to number
      const weightValue = parseFloat(formData.weight);
      
      // Convert units if needed
      const weightInKg = formData.units === 'g' 
        ? weightValue / 1000 
        : formData.units === 'lb' 
          ? weightValue * 0.453592 
          : weightValue;
      
      // Prepare data for Supabase
      const logData = {
        userID: formData.userID,
        businessID: formData.businessID,
        wasteType: formData.wasteType,
        weight: weightInKg, // Always store in kg
        location: formData.location || null,
        created_at: new Date().toISOString() // Use current time
      };
      
      // Add trashImageLink if image was uploaded
      if (imageFile) {
        // In a real implementation, you would:
        // 1. Upload the image to Supabase storage
        // 2. Get back the URL
        // 3. Add it to logData
        
        // Example (commented out):
        /*
        const fileName = `${formData.userID}-${Date.now()}-${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('waste-images')
          .upload(fileName, imageFile);
          
        if (uploadError) throw uploadError;
        
        const imageUrl = supabase.storage
          .from('waste-images')
          .getPublicUrl(fileName).data.publicUrl;
          
        logData.trashImageLink = imageUrl;
        */
        
        // For now, just add a placeholder
        logData.trashImageLink = 'image-uploaded-placeholder';
      }
      
      // Insert data into Wastelogs table
      const { data, error: insertError } = await supabase
        .from('Wastelogs')
        .insert([logData])
        .select();
      
      if (insertError) throw insertError;
      
      // Move to success stage
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
          onClick={() => setCurrentStage(STAGES.IMAGE_UPLOAD)}
        >
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Camera className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
          <p className="text-gray-600 text-sm">
            Take a photo of your waste and our AI will analyze it to estimate weight and type. (Coming soon)
          </p>
        </div>
        
        <div 
          className="bg-white rounded-xl border-2 border-blue-500 p-6 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col items-center text-center"
          onClick={() => setCurrentStage(STAGES.MANUAL_INPUT)}
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
  
  // Stage 2: Image upload and analysis
  const renderImageUploadStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Upload Waste Image</h2>
      <p className="text-gray-600">
        Upload a clear image of your waste for analysis. For best results, ensure the waste is clearly visible with good lighting.
      </p>
      
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
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-700">
                    <span className="font-semibold">AI Analysis Coming Soon!</span> Our image analysis feature is under development. For now, please proceed to manually enter waste details.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentStage(STAGES.MANUAL_INPUT)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue to Manual Entry
              </button>
            </div>
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
  
  // Stage 3: Manual input
  const renderManualInputStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Waste Details</h2>
      <p className="text-gray-600">
        Please enter the details about the waste you are logging.
      </p>
      
      {aiAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-700">
                {aiAnalysis.message}
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
  
  // Stage 5: Confirmation
  const renderConfirmationStage = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Confirm Your Entry</h2>
      <p className="text-gray-600">
        Please review the waste log information before submitting.
      </p>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">Waste Log Summary</h3>
        
        <div className="space-y-4">
          {/* Two-column layout for details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Main details */}
              <div>
                <p className="text-sm text-gray-500">Waste Type</p>
                <p className="font-medium">{formData.wasteType}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-medium">{formData.weight} {formData.units}</p>
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
              {/* User details */}
              <div>
                <p className="text-sm text-gray-500">Logged By</p>
                <p className="font-medium">{user?.username || 'Unknown User'}</p>
              </div>
              
              {/* Image preview if available */}
              {imagePreview && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Image</p>
                  <img 
                    src={imagePreview} 
                    alt="Waste preview" 
                    className="h-28 rounded-lg border border-gray-200"
                  />
                </div>
              )}
              
              {/* Notes if available */}
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
      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
          aria-label="Back to top"
        >
          <ChevronsUp className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default AddWasteForm;