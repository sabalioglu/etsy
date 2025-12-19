# Shared UI Components - Quick Reference

## Component Overview

| Component | Purpose | Key Props | Sizes | States |
|-----------|---------|-----------|-------|--------|
| **Button** | Interactive actions | variant, size, loading, disabled | sm, md, lg | loading, disabled |
| **Card** | Content container | padding, header, footer | - | - |
| **Input** | Text input field | label, error, helperText, icon | - | disabled, error |
| **Badge** | Status indicator | status, label | - | pending, processing, completed, failed |
| **Modal** | Dialog window | isOpen, onClose, title, size | sm, md, lg, xl | open/closed |
| **LoadingSpinner** | Loading indicator | size, text, centered | sm, md, lg, xl | spinning |

---

## Quick Imports

```typescript
// Individual
import { Button } from '@/components/shared';
import { Card } from '@/components/shared';
import { Input } from '@/components/shared';
import { Badge } from '@/components/shared';
import { Modal } from '@/components/shared';
import { LoadingSpinner } from '@/components/shared';

// Batch
import { Button, Card, Input, Badge, Modal, LoadingSpinner } from '@/components/shared';

// With types
import { Button, ButtonVariant, Badge, BadgeStatus } from '@/components/shared';
```

---

## Component Snippets

### Button
```typescript
// Basic
<Button>Click me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">Learn More</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Processing...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

### Card
```typescript
// Basic
<Card>Content</Card>

// With header
<Card header={<h3>Title</h3>}>Content</Card>

// With footer
<Card footer={<button>Action</button>}>Content</Card>

// With header and footer
<Card
  header={<h3>Title</h3>}
  footer={<button>Action</button>}
>
  Content
</Card>

// Padding options
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>
<Card padding="none">No padding</Card>
```

### Input
```typescript
// Basic
<Input label="Name" placeholder="Enter name" />

// With error
<Input label="Email" error="Invalid email" />

// With helper text
<Input
  label="Password"
  helperText="8+ characters"
/>

// With icon
<Input
  label="Search"
  icon={<Search className="w-4 h-4" />}
/>

// Disabled
<Input label="ID" value="123" disabled />
```

### Badge
```typescript
// Status badges
<Badge status="pending" />
<Badge status="processing" />
<Badge status="completed" />
<Badge status="failed" />

// Custom labels
<Badge status="pending" label="Awaiting Approval" />
<Badge status="processing">In Progress</Badge>
```

### Modal
```typescript
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm"
>
  Are you sure?
</Modal>

// With footer
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </>
  }
>
  This action cannot be undone.
</Modal>

// Different sizes
<Modal size="sm">...</Modal>
<Modal size="md">...</Modal>
<Modal size="lg">...</Modal>
<Modal size="xl">...</Modal>
```

### LoadingSpinner
```typescript
// Basic
<LoadingSpinner />

// With text
<LoadingSpinner text="Loading..." />

// Different sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Full screen
<LoadingSpinner centered text="Loading..." />
```

---

## Common Patterns

### Form with Button
```typescript
function MyForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // API call
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Email" type="email" />
      <Button loading={isLoading} type="submit">
        Submit
      </Button>
    </form>
  );
}
```

### Card List with Status
```typescript
function ProductList() {
  const products = [
    { id: 1, name: 'Product 1', status: 'completed' },
    { id: 2, name: 'Product 2', status: 'pending' },
  ];

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <Card key={product.id} padding="md">
          <div className="flex justify-between items-center">
            <span>{product.name}</span>
            <Badge status={product.status} />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Confirmation Modal
```typescript
function DeleteButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Delete logic
    setIsDeleting(false);
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </>
        }
      >
        Are you sure? This cannot be undone.
      </Modal>
    </>
  );
}
```

### Async Search
```typescript
function SearchProducts() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setIsSearching(true);
      // Search API call
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
      />
      {isSearching && <LoadingSpinner text="Searching..." />}
      {/* Results */}
    </div>
  );
}
```

---

## Styling Tips

### Add Custom Styles
```typescript
// Using className prop
<Button className="rounded-full px-8">Custom</Button>
<Card className="shadow-lg">Content</Card>

// Tailwind utilities
<Button className="bg-gradient-to-r from-blue-500 to-purple-600">
  Gradient
</Button>
```

### Responsive Design
```typescript
<Card className="md:w-1/2 lg:w-1/3">
  Responsive Card
</Card>
```

---

## Type Definitions

### Button Types
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}
```

### Badge Types
```typescript
type BadgeStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BadgeStatus;
  label?: string;
  children?: React.ReactNode;
}
```

### Input Types
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

### Modal Types
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
```

### LoadingSpinner Types
```typescript
type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  text?: string;
  centered?: boolean;
  className?: string;
}
```

---

## Accessibility Notes

- **Button**: Has focus states and disabled support
- **Input**: Label is associated, errors announced
- **Badge**: Color + visual indicator for status
- **Modal**: Keyboard navigation (ESC), ARIA attributes
- **LoadingSpinner**: Screen reader friendly

---

## Files Location

```
/src/components/shared/
├── Badge.tsx
├── Button.tsx
├── Card.tsx
├── Input.tsx
├── LoadingSpinner.tsx
├── Modal.tsx
├── index.ts
├── COMPONENTS.md          (Full documentation)
├── USAGE_EXAMPLES.tsx     (Real-world examples)
└── README.md              (Getting started)
```

---

## Documentation Links

- Full API: `/src/components/shared/COMPONENTS.md`
- Examples: `/src/components/shared/USAGE_EXAMPLES.tsx`
- Getting Started: `/src/components/shared/README.md`
