// ABOUTME: Demo component showcasing SlideoutForm functionality with various configurations
// ABOUTME: Demonstrates form validation integration, auto-save, and different slideout variants

import React, { useState } from 'react';
import { SlideoutForm } from './ui/forms/SlideoutForm';
import { useSlideout } from '../hooks/useSlideout';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { FormField } from './ui/forms/FormField';
import { DatePicker } from './ui/forms/DatePicker';

interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  notes: string;
}

const SlideoutFormDemo: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<StudentFormData | null>(null);

  // Slideout state management
  const slideout = useSlideout<StudentFormData>({
    autoSave: true,
    autoSaveDelay: 1500,
    onSave: async (data) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving student data:', data);
    },
    onClose: () => {
      setSelectedStudent(null);
    },
  });

  // Form validation configuration
  const validationConfig = {
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
    dateOfBirth: {
      rules: [
        validators.required('Date of birth is required'),
      ],
    },
    grade: {
      rules: [
        validators.required('Grade is required'),
      ],
    },
    guardianName: {
      rules: [
        validators.required('Guardian name is required'),
      ],
    },
    guardianPhone: {
      rules: [
        validators.required('Guardian phone is required'),
        validators.pattern(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
      ],
    },
  };

  const formValidation = useFormValidation<StudentFormData>(validationConfig, {
    mode: 'onChange',
    announceErrors: true,
  });

  // Sample student data
  const sampleStudents = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      dateOfBirth: '2010-05-15',
      grade: '8',
      guardianName: 'Jane Doe',
      guardianPhone: '+1 (555) 123-4567',
      notes: 'Excellent student with strong academic performance.',
    },
    {
      firstName: 'Sarah',
      lastName: 'Smith',
      email: 'sarah.smith@example.com',
      dateOfBirth: '2009-08-22',
      grade: '9',
      guardianName: 'Michael Smith',
      guardianPhone: '+1 (555) 987-6543',
      notes: 'Active in sports and drama club.',
    },
  ];

  const gradeOptions = [
    { value: '6', label: 'Grade 6' },
    { value: '7', label: 'Grade 7' },
    { value: '8', label: 'Grade 8' },
    { value: '9', label: 'Grade 9' },
    { value: '10', label: 'Grade 10' },
    { value: '11', label: 'Grade 11' },
    { value: '12', label: 'Grade 12' },
  ];

  const handleOpenSlideout = (student?: StudentFormData) => {
    const studentData = student || {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      grade: '',
      guardianName: '',
      guardianPhone: '',
      notes: '',
    };
    
    setSelectedStudent(studentData);
    slideout.open(studentData);
    formValidation.setFormData(studentData);
  };

  const handleSave = async () => {
    const isValid = await formValidation.validateForm();
    if (isValid) {
      return slideout.save();
    }
    return false;
  };

  const handleFieldChange = (fieldName: keyof StudentFormData, value: string) => {
    formValidation.setFieldValue(fieldName, value);
    slideout.updateData({ [fieldName]: value });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Slideout Form Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Demonstration of the SlideoutForm component with form validation, auto-save functionality, 
          and different configurations.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">New Student</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create a new student record with form validation and auto-save.
          </p>
          <Button
            variant="primary"
            onClick={() => handleOpenSlideout()}
            className="w-full"
          >
            Add New Student
          </Button>
        </div>

        {sampleStudents.map((student, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-2">
              {student.firstName} {student.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Grade {student.grade} • {student.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Guardian: {student.guardianName}
            </p>
            <Button
              variant="outline"
              onClick={() => handleOpenSlideout(student)}
              className="w-full"
            >
              Edit Student
            </Button>
          </div>
        ))}
      </div>

      {/* SlideoutForm Component */}
      <SlideoutForm
        isOpen={slideout.isOpen}
        onClose={slideout.close}
        title={selectedStudent?.firstName ? `Edit ${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Add New Student'}
        width="lg"
        position="right"
        overlay={true}
        closeOnOverlayClick={true}
        closeOnEscape={true}
        loading={slideout.isLoading}
        onSave={handleSave}
        onCancel={slideout.close}
        saveLabel="Save Student"
        cancelLabel="Cancel"
        autoSave={true}
        autoSaveDelay={1500}
        preventClose={slideout.hasUnsavedChanges}
      >
        <div className="space-y-6">
          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                required
                error={formValidation.getFieldProps('firstName').error}
              >
                <Input
                  {...formValidation.getFieldProps('firstName')}
                  placeholder="Enter first name"
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={formValidation.getFieldProps('lastName').error}
              >
                <Input
                  {...formValidation.getFieldProps('lastName')}
                  placeholder="Enter last name"
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                />
              </FormField>

              <FormField
                label="Email"
                required
                error={formValidation.getFieldProps('email').error}
              >
                <Input
                  {...formValidation.getFieldProps('email')}
                  type="email"
                  placeholder="Enter email address"
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </FormField>

              <FormField
                label="Date of Birth"
                required
                error={formValidation.getFieldProps('dateOfBirth').error}
              >
                <DatePicker
                  value={formValidation.formData.dateOfBirth}
                  onChange={(date) => handleFieldChange('dateOfBirth', date)}
                  placeholder="Select date of birth"
                />
              </FormField>

              <FormField
                label="Grade"
                required
                error={formValidation.getFieldProps('grade').error}
              >
                <Select
                  value={formValidation.formData.grade}
                  onChange={(value) => handleFieldChange('grade', value)}
                  options={gradeOptions}
                  placeholder="Select grade"
                />
              </FormField>
            </div>
          </div>

          {/* Guardian Information Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Guardian Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Guardian Name"
                required
                error={formValidation.getFieldProps('guardianName').error}
              >
                <Input
                  {...formValidation.getFieldProps('guardianName')}
                  placeholder="Enter guardian name"
                  onChange={(e) => handleFieldChange('guardianName', e.target.value)}
                />
              </FormField>

              <FormField
                label="Guardian Phone"
                required
                error={formValidation.getFieldProps('guardianPhone').error}
              >
                <Input
                  {...formValidation.getFieldProps('guardianPhone')}
                  type="tel"
                  placeholder="Enter phone number"
                  onChange={(e) => handleFieldChange('guardianPhone', e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* Additional Information Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Additional Information
            </h3>
            <FormField
              label="Notes"
              helperText="Any additional information about the student"
            >
              <textarea
                value={formValidation.formData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Enter any additional notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </FormField>
          </div>
        </div>
      </SlideoutForm>
    </div>
  );
};

export default SlideoutFormDemo;