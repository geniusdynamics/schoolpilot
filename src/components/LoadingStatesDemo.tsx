// ABOUTME: Demo component showcasing loading states and skeleton components
// ABOUTME: Interactive examples of all loading state variants with controls

import React, { useState } from 'react';
import {
    Skeleton,
    TextSkeleton,
    AvatarSkeleton,
    CardSkeleton,
    TableSkeleton,
    FormSkeleton,
    ListSkeleton,
    ProgressiveLoader,
    SpinnerLoader,
    LoadingOverlay,
} from './ui/feedback/LoadingStates';
import Button from './ui/Button';
import Card from './ui/Card';

const LoadingStatesDemo: React.FC = () => {
    const [showOverlay, setShowOverlay] = useState(false);
    const [progress, setProgress] = useState(45);
    const [animationType, setAnimationType] = useState<'pulse' | 'shimmer' | 'none'>('shimmer');

    const handleProgressChange = (increment: number) => {
        setProgress(prev => Math.max(0, Math.min(100, prev + increment)));
    };

    const toggleOverlay = () => {
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 3000);
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Loading States & Skeletons
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Comprehensive loading indicators with shimmer animations and accessibility support
                </p>

                {/* Controls */}
                <Card className="mb-8">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium">Animation:</label>
                                <select
                                    value={animationType}
                                    onChange={(e) => setAnimationType(e.target.value as 'pulse' | 'shimmer' | 'none')}
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                >
                                    <option value="shimmer">Shimmer</option>
                                    <option value="pulse">Pulse</option>
                                    <option value="none">None</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium">Progress:</label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleProgressChange(-10)}
                                    disabled={progress <= 0}
                                >
                                    -10%
                                </Button>
                                <span className="text-sm font-mono w-12 text-center">{progress}%</span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleProgressChange(10)}
                                    disabled={progress >= 100}
                                >
                                    +10%
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="primary"
                                onClick={toggleOverlay}
                            >
                                Show Overlay
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Basic Skeletons */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Basic Skeletons</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Text Skeleton</h3>
                                <Skeleton width="100%" height="1rem" animation={animationType} />
                                <div className="mt-2">
                                    <Skeleton width="80%" height="1rem" animation={animationType} />
                                </div>
                                <div className="mt-2">
                                    <Skeleton width="60%" height="1rem" animation={animationType} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Rectangular</h3>
                                <Skeleton width="100%" height="8rem" variant="rectangular" animation={animationType} />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Circular</h3>
                                <div className="flex space-x-3">
                                    <Skeleton width="3rem" height="3rem" variant="circular" animation={animationType} />
                                    <Skeleton width="4rem" height="4rem" variant="circular" animation={animationType} />
                                    <Skeleton width="5rem" height="5rem" variant="circular" animation={animationType} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Text Skeleton Variants */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Text Skeleton Variants</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">3 Lines</h3>
                                <TextSkeleton lines={3} animation={animationType} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">5 Lines</h3>
                                <TextSkeleton lines={5} animation={animationType} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Avatar Skeletons */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Avatar Skeletons</h2>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <AvatarSkeleton size="sm" animation={animationType} />
                                <p className="text-xs mt-2 text-gray-500">Small</p>
                            </div>
                            <div className="text-center">
                                <AvatarSkeleton size="md" animation={animationType} />
                                <p className="text-xs mt-2 text-gray-500">Medium</p>
                            </div>
                            <div className="text-center">
                                <AvatarSkeleton size="lg" animation={animationType} />
                                <p className="text-xs mt-2 text-gray-500">Large</p>
                            </div>
                            <div className="text-center">
                                <AvatarSkeleton size="xl" animation={animationType} />
                                <p className="text-xs mt-2 text-gray-500">Extra Large</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Card Skeletons */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Card Skeletons</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">With Avatar</h3>
                                <CardSkeleton showAvatar={true} animation={animationType} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Without Avatar</h3>
                                <CardSkeleton showAvatar={false} animation={animationType} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Table Skeleton */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Table Skeleton</h2>
                        <TableSkeleton rows={5} columns={4} animation={animationType} />
                    </div>
                </Card>

                {/* Form Skeleton */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Form Skeleton</h2>
                        <div className="max-w-md">
                            <FormSkeleton fields={4} animation={animationType} />
                        </div>
                    </div>
                </Card>

                {/* List Skeleton */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">List Skeleton</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">With Avatars</h3>
                                <ListSkeleton items={4} showAvatar={true} animation={animationType} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Without Avatars</h3>
                                <ListSkeleton items={4} showAvatar={false} animation={animationType} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Progress Loaders */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Progress Loaders</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">With Percentage</h3>
                                <ProgressiveLoader progress={progress} showPercentage={true} label="Loading data" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Without Percentage</h3>
                                <ProgressiveLoader progress={progress} showPercentage={false} label="Processing" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Spinner Loaders */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Spinner Loaders</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center space-y-4">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Spinner</h3>
                                <div className="flex justify-center space-x-4">
                                    <SpinnerLoader size="sm" variant="default" />
                                    <SpinnerLoader size="md" variant="default" />
                                    <SpinnerLoader size="lg" variant="default" />
                                </div>
                            </div>

                            <div className="text-center space-y-4">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Dots Spinner</h3>
                                <div className="flex justify-center space-x-4">
                                    <SpinnerLoader size="sm" variant="dots" />
                                    <SpinnerLoader size="md" variant="dots" />
                                    <SpinnerLoader size="lg" variant="dots" />
                                </div>
                            </div>

                            <div className="text-center space-y-4">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bars Spinner</h3>
                                <div className="flex justify-center space-x-4">
                                    <SpinnerLoader size="sm" variant="bars" />
                                    <SpinnerLoader size="md" variant="bars" />
                                    <SpinnerLoader size="lg" variant="bars" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Usage Examples */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Loading Dashboard</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <CardSkeleton showAvatar={false} showActions={false} animation={animationType} />
                                    <CardSkeleton showAvatar={false} showActions={false} animation={animationType} />
                                    <CardSkeleton showAvatar={false} showActions={false} animation={animationType} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Loading User Profile</h3>
                                <div className="flex space-x-6">
                                    <AvatarSkeleton size="xl" animation={animationType} />
                                    <div className="flex-1 space-y-3">
                                        <Skeleton width="40%" height="1.5rem" animation={animationType} />
                                        <Skeleton width="60%" height="1rem" animation={animationType} />
                                        <TextSkeleton lines={3} animation={animationType} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Loading Overlay */}
                <LoadingOverlay isVisible={showOverlay} message="Processing your request..." />
            </div>
        </div>
    );
};

export default LoadingStatesDemo;
