# Shared UI Components

Production-ready, accessible, reusable UI components for the Etsy Product Management Platform.

## Quick Links

- **[COMPONENTS.md](./COMPONENTS.md)** - Detailed documentation and API reference
- **[USAGE_EXAMPLES.tsx](./USAGE_EXAMPLES.tsx)** - Real-world usage examples

## Components

1. **Button** - Versatile button with variants, sizes, and loading state
2. **Card** - Container component with optional header/footer
3. **Input** - Text input with label, error, and icon support
4. **Badge** - Status indicator with 4 predefined status types
5. **Modal** - Dialog component with keyboard support
6. **LoadingSpinner** - Animated loading indicator

## Quick Start

```tsx
import { Button, Card, Input, Badge, Modal, LoadingSpinner } from '@/components/shared';

// Use in your components
<Card header={<h2>Title</h2>}>
  <Input label="Name" placeholder="Enter name" />
  <Button onClick={handleSave}>Save</Button>
</Card>
```

## Features

- Full TypeScript support
- Tailwind CSS styling
- WCAG accessibility compliance
- Focus management
- ESC key support (Modal)
- Loading states
- Error handling
- Responsive design

## Files

```
shared/
├── Badge.tsx              # Status badge component
├── Button.tsx             # Button component
├── Card.tsx               # Card container component
├── Input.tsx              # Input field component
├── LoadingSpinner.tsx     # Loading spinner component
├── Modal.tsx              # Modal dialog component
├── index.ts               # Central export file
├── COMPONENTS.md          # Detailed API documentation
├── USAGE_EXAMPLES.tsx     # Real-world usage examples
└── README.md              # This file
```

## Installation

Components are already included in this project. Just import and use:

```tsx
import { Button } from '@/components/shared';
```

## Support

For detailed documentation, see [COMPONENTS.md](./COMPONENTS.md)

For usage examples, see [USAGE_EXAMPLES.tsx](./USAGE_EXAMPLES.tsx)
