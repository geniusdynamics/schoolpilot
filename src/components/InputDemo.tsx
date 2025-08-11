// ABOUTME: Demo component showcasing the enhanced Input component features
// ABOUTME: Demonstrates floating labels, validation states, icons, and variants

import React, { useState } from 'react';
import { Input, FormField } from './ui';

// Icon components for demo
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const InputDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    search: '',
    phone: '',
    website: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateEmail = (email: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return undefined;
  };

  const simulateAsyncValidation = (field: string) => {
    setLoading(prev => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setLoading(prev => ({ ...prev, [field]: false }));
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Input Component Demo</h1>
        <p className="text-gray-600">Showcasing modern input features with floating labels, validation, and animations</p>
      </div>

      {/* Basic Inputs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Basic Inputs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange('name')}
            leftIcon={<UserIcon />}
          />
          
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange('email')}
            leftIcon={<EmailIcon />}
            onValidate={validateEmail}
            error={errors.email}
          />
        </div>
      </section>

      {/* Variants */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Input Variants</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Outlined (Default)"
            variant="outlined"
            placeholder="Outlined input"
            value={formData.search}
            onChange={handleChange('search')}
            leftIcon={<SearchIcon />}
          />
          
          <Input
            label="Filled Variant"
            variant="filled"
            placeholder="Filled input"
            value={formData.phone}
            onChange={handleChange('phone')}
          />
          
          <Input
            label="Standard Variant"
            variant="standard"
            placeholder="Standard input"
            value={formData.website}
            onChange={handleChange('website')}
          />
        </div>
      </section>

      {/* Sizes */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Input Sizes</h2>
        
        <div className="space-y-4">
          <Input
            label="Small Size"
            size="sm"
            placeholder="Small input"
            leftIcon={<SearchIcon />}
          />
          
          <Input
            label="Medium Size (Default)"
            size="md"
            placeholder="Medium input"
            leftIcon={<SearchIcon />}
          />
          
          <Input
            label="Large Size"
            size="lg"
            placeholder="Large input"
            leftIcon={<SearchIcon />}
          />
        </div>
      </section>

      {/* States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Input States</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Success State"
            placeholder="Valid input"
            value="valid@example.com"
            success={true}
            helperText="This email is available"
          />
          
          <Input
            label="Error State"
            placeholder="Invalid input"
            value="invalid-email"
            error="Please enter a valid email address"
          />
          
          <Input
            label="Loading State"
            placeholder="Checking availability..."
            value="checking@example.com"
            loading={true}
          />
          
          <Input
            label="Disabled State"
            placeholder="Disabled input"
            disabled={true}
            value="Cannot edit this"
          />
        </div>
      </section>

      {/* Floating Labels */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Floating vs Static Labels</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Floating Label (Default)"
            placeholder="Type to see floating effect"
            floatingLabel={true}
            leftIcon={<UserIcon />}
          />
          
          <Input
            label="Static Label"
            placeholder="Label stays in place"
            floatingLabel={false}
            leftIcon={<UserIcon />}
          />
        </div>
      </section>

      {/* FormField Wrapper */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">FormField Wrapper</h2>
        
        <div className="space-y-6">
          <FormField
            label="Username"
            helperText="Choose a unique username (3-20 characters)"
            required
          >
            <Input
              placeholder="Enter username"
              floatingLabel={false}
              leftIcon={<UserIcon />}
            />
          </FormField>
          
          <FormField
            label="Bio"
            helperText="Tell us about yourself"
            optional
            layout="horizontal"
          >
            <Input
              placeholder="Enter your bio"
              floatingLabel={false}
            />
          </FormField>
          
          <FormField
            label="Password"
            error="Password must be at least 8 characters"
            required
          >
            <Input
              type="password"
              placeholder="Enter password"
              floatingLabel={false}
              onValidate={validatePassword}
            />
          </FormField>
          
          <FormField
            label="Confirmation"
            success={true}
          >
            <Input
              placeholder="Passwords match"
              floatingLabel={false}
              success={true}
            />
          </FormField>
        </div>
      </section>

      {/* Glow Effects Demo */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Glow Effects</h2>
        
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-gray-600 mb-4">Click on the inputs to see the beautiful glow effects:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Focus Glow"
              placeholder="Click to see blue glow"
              helperText="Beautiful blue glow when focused"
            />
            
            <Input
              label="Success Glow"
              placeholder="Valid input"
              value="success@example.com"
              success={true}
              helperText="Green glow for success state"
            />
            
            <Input
              label="Error Glow"
              placeholder="Invalid input"
              value="invalid-email"
              error="Red glow for error state"
            />
            
            <Input
              label="Loading Glow"
              placeholder="Loading state"
              loading={true}
              helperText="Pulsing glow during loading"
            />
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">Interactive Demo</h2>
        
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-gray-600 mb-4">Try typing in these fields to see the animations and validation in action:</p>
          
          <div className="space-y-4">
            <Input
              label="Password"
              type="password"
              placeholder="Enter a secure password"
              value={formData.password}
              onChange={handleChange('password')}
              onValidate={validatePassword}
              helperText="Must be at least 8 characters long"
            />
            
            <div className="flex gap-4">
              <button
                onClick={() => simulateAsyncValidation('async')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Async Validation
              </button>
              
              <Input
                label="Async Validation"
                placeholder="Click button to test"
                loading={loading.async}
                success={!loading.async && formData.email.includes('@')}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InputDemo;