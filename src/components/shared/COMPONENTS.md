# Shared UI Components Documentation

This directory contains reusable, production-ready UI components built with React, TypeScript, and Tailwind CSS for the Etsy Product Management Platform.

## Components Overview

### 1. Button Component

Versatile button component with multiple variants and sizes.

**Props:**
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style variant (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `loading?: boolean` - Shows loading spinner (default: false)
- `disabled?: boolean` - Disables the button (default: false)
- `fullWidth?: boolean` - Makes button full width (default: false)
- `children: React.ReactNode` - Button text or content (required)

**Usage Examples:**

```tsx
import { Button } from '@/components/shared';

// Primary button
<Button onClick={handleClick}>Save</Button>

// Secondary button with size
<Button variant="secondary" size="lg">Cancel</Button>

// Danger button
<Button variant="danger">Delete</Button>

// Ghost button
<Button variant="ghost" size="sm">Learn More</Button>

// Loading state
<Button loading>Processing...</Button>

// Full width disabled
<Button fullWidth disabled>Disabled</Button>
```

---

### 2. Card Component

Container component for grouping related content with optional header and footer.

**Props:**
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Content padding (default: 'md')
- `header?: React.ReactNode` - Card header content
- `footer?: React.ReactNode` - Card footer content
- `children: React.ReactNode` - Card body content (required)

**Usage Examples:**

```tsx
import { Card } from '@/components/shared';

// Basic card
<Card>
  <p>Card content goes here</p>
</Card>

// Card with header and footer
<Card
  header={<h3 className="text-lg font-semibold">Product Details</h3>}
  footer={<button className="text-blue-600">Edit</button>}
>
  <p>Product information</p>
</Card>

// Card with custom padding
<Card padding="lg">
  <p>Large padded content</p>
</Card>

// Card with no padding
<Card padding="none">
  <img src="image.jpg" alt="Cover" />
</Card>
```

---

### 3. Input Component

Text input with label, error handling, and optional icon support.

**Props:**
- `label?: string` - Input label text
- `error?: string` - Error message displayed below input
- `helperText?: string` - Helper text (shown only when no error)
- `icon?: React.ReactNode` - Icon element (typically from lucide-react)
- `fullWidth?: boolean` - Makes input full width (default: true)
- All standard HTML input attributes (type, placeholder, disabled, etc.)

**Usage Examples:**

```tsx
import { Input } from '@/components/shared';
import { Mail, Search } from 'lucide-react';

// Basic input
<Input label="Email" type="email" placeholder="Enter your email" />

// Input with error
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// Input with helper text
<Input
  label="Username"
  helperText="3-20 characters, alphanumeric only"
/>

// Input with icon
<Input
  label="Search"
  placeholder="Search products..."
  icon={<Search className="w-4 h-4" />}
/>

// Disabled input
<Input label="ID" value="12345" disabled />
```

---

### 4. Badge Component

Status indicator badge with predefined status types and colors.

**Props:**
- `status: 'pending' | 'processing' | 'completed' | 'failed'` - Status type (required)
- `label?: string` - Custom label (overrides default)
- `children?: React.ReactNode` - Alternative to label prop

**Status Colors:**
- `pending` - Yellow background and text
- `processing` - Blue background and text
- `completed` - Green background and text
- `failed` - Red background and text

**Usage Examples:**

```tsx
import { Badge } from '@/components/shared';

// Default labels
<Badge status="pending" />
<Badge status="processing" />
<Badge status="completed" />
<Badge status="failed" />

// Custom labels
<Badge status="pending" label="Awaiting Approval" />
<Badge status="processing">In Progress</Badge>
<Badge status="completed" label="Published" />
```

---

### 5. Modal Component

Dialog modal with customizable header, body, and footer with keyboard support (ESC to close).

**Props:**
- `isOpen: boolean` - Controls modal visibility (required)
- `onClose: () => void` - Callback when modal should close (required)
- `title?: string` - Modal title (displayed if no custom header)
- `header?: React.ReactNode` - Custom header content
- `footer?: React.ReactNode` - Footer actions/buttons
- `children: React.ReactNode` - Modal body content (required)
- `closeButton?: boolean` - Show close button (default: true)
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal width (default: 'md')

**Features:**
- Click outside to close (backdrop click)
- ESC key to close
- Prevents body scroll when open
- Accessible (ARIA attributes)

**Usage Examples:**

```tsx
import { Modal, Button } from '@/components/shared';
import { useState } from 'react';

function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Delete</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Delete"
      >
        <p>Are you sure you want to delete this item?</p>
        <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
      </Modal>
    </>
  );
}

// With custom footer
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Product"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleCreate}>Create</Button>
    </>
  }
>
  {/* Form content */}
</Modal>

// Large modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="lg"
  title="Product Details"
>
  {/* Large content */}
</Modal>
```

---

### 6. LoadingSpinner Component

Animated loading spinner with optional text.

**Props:**
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Spinner size (default: 'md')
- `text?: string` - Loading text displayed below spinner
- `centered?: boolean` - Center spinner on full screen (default: false)

**Usage Examples:**

```tsx
import { LoadingSpinner } from '@/components/shared';

// Basic spinner
<LoadingSpinner />

// Spinner with text
<LoadingSpinner text="Loading products..." />

// Different sizes
<LoadingSpinner size="sm" text="Small" />
<LoadingSpinner size="lg" text="Large" />

// Centered full screen
<LoadingSpinner centered text="Loading..." />

// In a container
<div className="h-32 flex items-center justify-center">
  <LoadingSpinner size="sm" />
</div>
```

---

## Accessibility Features

All components follow accessibility best practices:

- **Button**: Focus states, disabled states, loading indicators
- **Input**: Label associations, error announcements, helper text
- **Badge**: Semantic color coding with color indicators
- **Modal**: ARIA attributes, keyboard navigation (ESC), focus trap
- **LoadingSpinner**: Screen reader text, ARIA live region attributes

## Tailwind CSS Integration

All components use Tailwind CSS utility classes for styling. Ensure your project has:

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## TypeScript Support

All components are fully typed with TypeScript for excellent IDE support and type safety.

```tsx
import { Button, ButtonProps } from '@/components/shared';

const MyButton: React.FC<ButtonProps> = (props) => (
  <Button {...props} />
);
```

## Importing Components

### Individual imports:
```tsx
import { Button } from '@/components/shared';
import { Card } from '@/components/shared';
```

### Batch imports:
```tsx
import { Button, Card, Input, Badge, Modal, LoadingSpinner } from '@/components/shared';
```

### With types:
```tsx
import { Button, ButtonProps, Badge, BadgeStatus } from '@/components/shared';
```

## Best Practices

1. **Button**: Use appropriate variants for action importance
2. **Card**: Use for grouping related content
3. **Input**: Always provide a label for accessibility
4. **Badge**: Use status prop to automatically apply correct styling
5. **Modal**: Always call onClose in footer actions
6. **LoadingSpinner**: Show while async operations are pending

## Customization

All components accept a `className` prop for additional styling:

```tsx
<Button className="rounded-full px-8">Custom Button</Button>
<Card className="shadow-lg">Custom Card</Card>
```

## Dependencies

- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- lucide-react (for icons in Input and Modal components)
