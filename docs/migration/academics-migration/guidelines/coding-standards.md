# Academics Micro-Frontend - Coding Standards

This document outlines the coding standards and best practices to be followed when developing new micro-frontends for the Academics module.

## General Principles

- **Modularity**: Each micro-frontend should be a self-contained, independent unit.
- **Clarity**: Write clear, readable, and well-documented code.
- **Consistency**: Adhere to the established coding styles and patterns.

## Vue.js Best Practices

- **Component Naming**: Use PascalCase for component names (e.g., `GradeBook.vue`).
- **Props**: Define props with `type`, `required`, and `default` values where applicable.
- **Events**: Use kebab-case for event names (e.g., `student-selected`).
- **State Management**: Utilize Pinia for centralized state management.

## TypeScript Usage

- **Strict Mode**: Enable strict mode in `tsconfig.json` for all new projects.
- **Type Everything**: Provide explicit types for variables, function parameters, and return values.
- **Interfaces**: Use interfaces to define the shape of objects and API responses.

## Linting and Formatting

- **ESLint**: All code must pass ESLint checks based on the provided `.eslintrc.js` configuration.
- **Prettier**: Use Prettier for consistent code formatting. It is recommended to configure your IDE to format on save.

## Testing

- **Unit Tests**: Write unit tests for all components and utility functions using Vitest.
- **Integration Tests**: Create integration tests to verify the interaction between components.
- **End-to-End Tests**: Develop end-to-end tests for critical user flows using Playwright.

