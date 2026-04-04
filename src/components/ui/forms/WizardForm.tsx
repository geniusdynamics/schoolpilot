// ABOUTME: WizardForm component for multi-step forms with progress indicators
// ABOUTME: Provides step navigation, validation, and progress tracking

import React, { ReactNode, useState, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useTransition } from '../../../utils/animations';
import Button from '../Button';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '../icons';

export interface WizardStep {
  /** Unique step identifier */
  id: string;
  /** Step title displayed in stepper */
  title: string;
  /** Optional step description */
  description?: string;
  /** Step content */
  content: ReactNode;
  /** Validation function - return true to allow progression */
  validate?: () => boolean | Promise<boolean>;
  /** Mark step as optional */
  optional?: boolean;
  /** Icon to display instead of step number */
  icon?: ReactNode;
}

export interface WizardFormProps {
  /** Array of wizard steps */
  steps: WizardStep[];
  /** Called when all steps are completed */
  onComplete: () => void | Promise<void>;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Initial step index (0-based) */
  initialStep?: number;
  /** Allow skipping steps */
  allowSkip?: boolean;
  /** Validate before moving to next step */
  validateOnNext?: boolean;
  /** Show step descriptions */
  showStepDescriptions?: boolean;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical';
  /** Show progress bar */
  showProgress?: boolean;
  /** Custom previous button text */
  previousButtonText?: string;
  /** Custom next button text */
  nextButtonText?: string;
  /** Custom complete button text */
  completeButtonText?: string;
  /** Custom cancel button text */
  cancelButtonText?: string;
  /** Disable navigation while validating */
  disableNavigationWhileValidating?: boolean;
  /** Render custom navigation buttons */
  renderNavigation?: (props: {
    currentStep: number;
    totalSteps: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    isSubmitting: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onCancel?: () => void;
  }) => ReactNode;
}

export interface WizardFormRef {
  /** Go to next step */
  next: () => Promise<void>;
  /** Go to previous step */
  previous: () => void;
  /** Go to specific step */
  goToStep: (stepIndex: number) => void;
  /** Get current step index */
  getCurrentStep: () => number;
  /** Reset to initial step */
  reset: () => void;
}

/**
 * WizardForm - Multi-step form with progress indicator
 *
 * A complete solution for step-by-step forms with built-in navigation,
 * validation, and progress tracking.
 *
 * @example
 * const steps = [
 *   {
 *     id: 'personal',
 *     title: 'Personal Info',
 *     content: <PersonalInfoStep />,
 *     validate: () => validatePersonalInfo(),
 *   },
 *   {
 *     id: 'contact',
 *     title: 'Contact',
 *     content: <ContactStep />,
 *     validate: () => validateContact(),
 *   },
 *   {
 *     id: 'review',
 *     title: 'Review',
 *     content: <ReviewStep />,
 *   },
 * ];
 *
 * <WizardForm
 *   steps={steps}
 *   onComplete={handleSubmit}
 *   onCancel={handleCancel}
 * />
 */
const WizardForm = forwardRef<WizardFormRef, WizardFormProps>(({
  steps,
  onComplete,
  onCancel,
  className = '',
  initialStep = 0,
  allowSkip = false,
  validateOnNext = true,
  showStepDescriptions = true,
  variant = 'horizontal',
  showProgress = true,
  previousButtonText = 'Previous',
  nextButtonText = 'Next',
  completeButtonText = 'Complete',
  cancelButtonText = 'Cancel',
  disableNavigationWhileValidating = true,
  renderNavigation,
}, ref) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);
  const transitionStyles = useTransition(['all']);

  // Computed values
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const handleNext = useCallback(async () => {
    if (isLastStep) return;

    const step = steps[currentStep];

    if (validateOnNext && step.validate) {
      setIsValidating(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          return;
        }
      } catch (error) {
        console.error('Step validation error:', error);
        return;
      } finally {
        setIsValidating(false);
      }
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(prev => prev + 1);

    // Scroll to top of content on step change
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentStep, isLastStep, steps, validateOnNext]);

  const handleComplete = useCallback(async () => {
    const step = steps[currentStep];

    if (validateOnNext && step.validate) {
      setIsValidating(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          return;
        }
      } catch (error) {
        console.error('Step validation error:', error);
        return;
      } finally {
        setIsValidating(false);
      }
    }

    setIsSubmitting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Form completion error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, steps, validateOnNext, onComplete]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      // Only allow going back or to completed steps
      if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1) || allowSkip) {
        setCurrentStep(stepIndex);
      }
    }
  }, [currentStep, completedSteps, steps.length, allowSkip]);

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps(new Set());
    setIsSubmitting(false);
    setIsValidating(false);
  }, [initialStep]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    next: handleNext,
    previous: handlePrevious,
    goToStep,
    getCurrentStep: () => currentStep,
    reset,
  }), [handleNext, handlePrevious, goToStep, currentStep, reset]);

  // Render step indicator
  const renderStepIndicator = () => {
    if (variant === 'horizontal') {
      return (
        <div className="mb-6">
          {/* Progress bar */}
          {showProgress && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={index > currentStep && !completedSteps.has(index - 1) && !allowSkip}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    font-semibold text-sm transition-all duration-200
                    ${index === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : index < currentStep || completedSteps.has(index)
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }
                  `}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  {index < currentStep || completedSteps.has(index) ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    index + 1
                  )}
                </button>

                {/* Step label */}
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  {showStepDescriptions && step.description && (
                    <p className="text-xs text-gray-400">{step.description}</p>
                  )}
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-4
                    ${index < currentStep || completedSteps.has(index) ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    // Vertical variant
    return (
      <div className="flex gap-6">
        {/* Step list */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(index)}
                disabled={index > currentStep && !completedSteps.has(index - 1) && !allowSkip}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                  transition-all duration-200
                  ${index === currentStep
                    ? 'bg-blue-50 text-blue-700'
                    : index < currentStep || completedSteps.has(index)
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <span className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  font-semibold text-sm
                  ${index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep || completedSteps.has(index)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {index < currentStep || completedSteps.has(index) ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-sm font-medium">{step.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1" ref={contentRef}>
          {steps[currentStep].content}
        </div>
      </div>
    );
  };

  // Default navigation buttons - right-aligned per design standard
  const defaultNavigation = (
    <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-200">
      {onCancel && (
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting || isValidating}
        >
          {cancelButtonText}
        </Button>
      )}
      {!isFirstStep && (
        <Button
          variant="secondary"
          onClick={handlePrevious}
          leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
          disabled={isSubmitting || (disableNavigationWhileValidating && isValidating)}
        >
          {previousButtonText}
        </Button>
      )}
      {isLastStep ? (
        <Button
          variant="primary"
          onClick={handleComplete}
          loading={isSubmitting}
          disabled={isValidating}
        >
          {completeButtonText}
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={handleNext}
          rightIcon={<ChevronRightIcon className="w-4 h-4" />}
          loading={isValidating}
          disabled={disableNavigationWhileValidating && isValidating}
        >
          {nextButtonText}
        </Button>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col ${className}`} style={transitionStyles}>
      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Step content */}
      {variant === 'horizontal' && (
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          {steps[currentStep].content}
        </div>
      )}

      {/* Navigation */}
      {renderNavigation
        ? renderNavigation({
            currentStep,
            totalSteps: steps.length,
            isFirstStep,
            isLastStep,
            isSubmitting,
            onPrevious: handlePrevious,
            onNext: handleNext,
            onCancel,
          })
        : defaultNavigation
      }
    </div>
  );
});

WizardForm.displayName = 'WizardForm';

export default WizardForm;
