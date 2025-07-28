# Academics Micro-Frontend - Folder Structure

This document defines the standard folder structure for all new Academics micro-frontends. Adhering to this structure ensures consistency and predictability across the project.

```
/src
|-- /assets
|   |-- /images
|   |-- /styles
|-- /components
|   |-- /common
|   |-- /features
|-- /composables
|-- /router
|   |-- index.ts
|-- /services
|-- /store
|   |-- /modules
|-- /types
|-- /utils
|-- /views
|-- App.vue
|-- main.ts
```

## Directory Descriptions

- **`assets`**: Static assets like images, fonts, and global stylesheets.
- **`components`**: Reusable Vue components.
  - **`common`**: Generic, application-wide components (e.g., Button, Modal).
  - **`features`**: Components specific to a particular feature of the micro-frontend.
- **`composables`**: Reusable Vue Composition API functions.
- **`router`**: Vue Router configuration.
- **`services`**: Modules for interacting with APIs.
- **`store`**: Pinia state management modules.
- **`types`**: TypeScript type definitions and interfaces.
- **`utils`**: Utility functions.
- **`views`**: Top-level components that correspond to routes.
- **`App.vue`**: The root Vue component.
- **`main.ts`**: The main entry point of the application.

