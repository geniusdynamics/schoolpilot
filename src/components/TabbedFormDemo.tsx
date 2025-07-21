// ABOUTME: Demo component showcasing TabbedForm functionality with validation and form state
// ABOUTME: Demonstrates multi-step forms, progress indicators, and responsive navigation

import React, { useState } from 'react';
import TabbedForm, { FormTab } from './ui/forms/TabbedForm';
import Input from './ui/Input';
import { Button } from './ui';
import useFormValidation, { validators } from '../hooks/useFormValidation';

// Icons for tabs
const PersonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ContactIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AcademicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ReviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TabbedFormDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<'student' | 'settings' | 'wizard'>('student');
  const [submitResult, setSubmitResult] = useState<string>('');

  // Form validation configuration
  const formConfig = {
    firstName: {
      rules: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
      ],
    },
    lastName: {
      rules: [
        validators.required('Last name is required'),
        validators.minLength(2, 'Last name must be at least 2 characters'),
      ],
    },
    email: {
      rules: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email address'),
      ],
    },
    phone: {
      rules: [
        validators.required('Phone number is required'),
        validators.pattern(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
      ],
    },
    grade: {
      rules: [
        validators.required('Grade is required'),
      ],
    },
    studentId: {
      rules: [
        validators.required('Student ID is required'),
        validators.pattern(/^[A-Z]{2}\d{4}$/, 'Student ID must be in format: AB1234'),
      ],
    },
  };

  const {
    formData,
    getFieldProps,
    handleSubmit,
    resetForm,
    isValid,
    isValidating,
    errors,
  } = useFormValidation(formConfig);

  // Student Registration Form
  const studentTabs: FormTab[] = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: <PersonIcon />,
      required: true,
      validation: () => {
        return !errors.firstName && !errors.lastName && formData.firstName && formData.lastName;
      },
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              {...getFieldProps('firstName')}
              label="First Name"
              placeholder="Enter first name"
            />
            <Input
              {...getFieldProps('lastName')}
              label="Last Name"
              placeholder="Enter last name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              {...getFieldProps('dateOfBirth')}
              label="Date of Birth"
              type="date"
            />
            <Input
              {...getFieldProps('gender')}
              label="Gender"
              placeholder="Select gender"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'contact',
      label: 'Contact Details',
      icon: <ContactIcon />,
      required: true,
      validation: () => {
        return !errors.email && !errors.phone && formData.email && formData.phone;
      },
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              {...getFieldProps('email')}
              label="Email Address"
              type="email"
              placeholder="student@example.com"
            />
            <Input
              {...getFieldProps('phone')}
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <Input
            {...getFieldProps('address')}
            label="Address"
            placeholder="Enter full address"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              {...getFieldProps('city')}
              label="City"
              placeholder="Enter city"
            />
            <Input
              {...getFieldProps('state')}
              label="State/Province"
              placeholder="Enter state"
            />
            <Input
              {...getFieldProps('zipCode')}
              label="ZIP/Postal Code"
              placeholder="Enter ZIP code"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'academic',
      label: 'Academic Info',
      icon: <AcademicIcon />,
      required: true,
      validation: () => {
        return !errors.grade && !errors.studentId && formData.grade && formData.studentId;
      },
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              {...getFieldProps('studentId')}
              label="Student ID"
              placeholder="AB1234"
              helperText="Format: Two letters followed by four numbers"
            />
            <Input
              {...getFieldProps('grade')}
              label="Grade Level"
              placeholder="Select grade"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              {...getFieldProps('previousSchool')}
              label="Previous School"
              placeholder="Enter previous school name"
            />
            <Input
              {...getFieldProps('enrollmentDate')}
              label="Enrollment Date"
              type="date"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Special Requirements
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Any special academic requirements or accommodations..."
            />
          </div>
        </div>
      ),
    },
    {
      id: 'review',
      label: 'Review & Submit',
      icon: <ReviewIcon />,
      validation: () => isValid,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Review Your Information</h3>
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{formData.firstName} {formData.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{formData.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{formData.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Student ID</dt>
                <dd className="text-sm text-gray-900">{formData.studentId}</dd>
              </div>
            </div>
          </div>
          
          {submitResult && (
            <div className={`p-4 rounded-md ${
              submitResult.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {submitResult}
            </div>
          )}
        </div>
      ),
    },
  ];

  // Handle form submission
  const onSubmit = async (data: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', data);
      setSubmitResult('Student registration submitted successfully!');
    } catch (error) {
      setSubmitResult('Error: Failed to submit registration. Please try again.');
    }
  };

  const handleCancel = () => {
    resetForm();
    setSubmitResult('');
  };

  // Validation state for tabs
  const tabValidation = {
    personal: !errors.firstName && !errors.lastName && formData.firstName && formData.lastName,
    contact: !errors.email && !errors.phone && formData.email && formData.phone,
    academic: !errors.grade && !errors.studentId && formData.grade && formData.studentId,
    review: isValid,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tabbed Form Component Demo</h1>
        <p className="text-lg text-gray-600 mb-8">
          Showcasing multi-step forms with validation, progress indicators, and responsive navigation
        </p>
      </div>

      {/* Demo Selector */}
      <div className="flex justify-center space-x-4 mb-8">
        <Button
          variant={currentDemo === 'student' ? 'primary' : 'outline'}
          onClick={() => setCurrentDemo('student')}
        >
          Student Registration
        </Button>
        <Button
          variant={currentDemo === 'settings' ? 'primary' : 'outline'}
          onClick={() => setCurrentDemo('settings')}
        >
          Settings Wizard
        </Button>
        <Button
          variant={currentDemo === 'wizard' ? 'primary' : 'outline'}
          onClick={() => setCurrentDemo('wizard')}
        >
          Setup Wizard
        </Button>
      </div>

      {/* Student Registration Demo */}
      {currentDemo === 'student' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Student Registration Form</h2>
            <p className="text-gray-600">Complete all required sections to register a new student</p>
          </div>
          
          <TabbedForm
            tabs={studentTabs}
            validation={tabValidation}
            onSubmit={onSubmit}
            onCancel={handleCancel}
            showProgress={true}
            variant="default"
            size="md"
            submitButtonText="Register Student"
            cancelButtonText="Clear Form"
            allowTabSwitching={true}
            preserveTabState={true}
          />
        </div>
      )}

      {/* Settings Wizard Demo */}
      {currentDemo === 'settings' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Settings Configuration</h2>
            <p className="text-gray-600">Configure your application settings step by step</p>
          </div>
          
          <TabbedForm
            tabs={[
              {
                id: 'general',
                label: 'General',
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">General Settings</h3>
                    <Input label="Application Name" defaultValue="SchoolPilot3" />
                    <Input label="Time Zone" defaultValue="UTC-5" />
                  </div>
                ),
              },
              {
                id: 'notifications',
                label: 'Notifications',
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Preferences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        Email notifications
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        SMS notifications
                      </label>
                    </div>
                  </div>
                ),
              },
              {
                id: 'security',
                label: 'Security',
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Security Settings</h3>
                    <Input label="Session Timeout (minutes)" type="number" defaultValue="30" />
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      Require two-factor authentication
                    </label>
                  </div>
                ),
              },
            ]}
            variant="pills"
            size="md"
            showProgress={true}
            onSubmit={async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              alert('Settings saved successfully!');
            }}
          />
        </div>
      )}

      {/* Setup Wizard Demo */}
      {currentDemo === 'wizard' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Application Setup Wizard</h2>
            <p className="text-gray-600">Set up your application with guided steps</p>
          </div>
          
          <TabbedForm
            tabs={[
              {
                id: 'welcome',
                label: 'Welcome',
                content: (
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-medium">Welcome to SchoolPilot3!</h3>
                    <p className="text-gray-600">Let's get your school management system set up in just a few steps.</p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800">This wizard will guide you through the initial configuration.</p>
                    </div>
                  </div>
                ),
              },
              {
                id: 'school-info',
                label: 'School Info',
                required: true,
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">School Information</h3>
                    <Input label="School Name" placeholder="Enter your school name" />
                    <Input label="School Address" placeholder="Enter school address" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Phone" placeholder="School phone number" />
                      <Input label="Email" type="email" placeholder="admin@school.edu" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'admin-account',
                label: 'Admin Account',
                required: true,
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Administrator Account</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="First Name" placeholder="Admin first name" />
                      <Input label="Last Name" placeholder="Admin last name" />
                    </div>
                    <Input label="Email" type="email" placeholder="admin@school.edu" />
                    <Input label="Password" type="password" placeholder="Create a secure password" />
                  </div>
                ),
              },
              {
                id: 'complete',
                label: 'Complete',
                content: (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium">Setup Complete!</h3>
                    <p className="text-gray-600">Your school management system is ready to use.</p>
                  </div>
                ),
              },
            ]}
            variant="underline"
            size="lg"
            showProgress={true}
            allowTabSwitching={false}
            mobileBreakpoint="md"
            onSubmit={async () => {
              await new Promise(resolve => setTimeout(resolve, 1500));
              alert('Setup completed successfully!');
            }}
            submitButtonText="Complete Setup"
          />
        </div>
      )}

      {/* Feature Highlights */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">TabbedForm Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Multi-step form navigation</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Progress indicators</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Validation state indicators</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Responsive mobile navigation</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Form state preservation</span>
          </div>
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accessibility compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabbedFormDemo;