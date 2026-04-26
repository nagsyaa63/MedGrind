# Frontend Coding Patterns

## API Calls
Always use apiClient — never raw fetch/axios.
```js
import apiClient from '../api/apiClient';
const { data } = await apiClient.get('/questions', { params });
```

## Error Handling
```js
try {
  const { data } = await apiClient.post('/auth/login', { email, password });
} catch (err) {
  setError(err.response?.data?.error || 'Fallback message');
}
```
Always read `err.response?.data?.error` (not `.message`).

## Auth Context
```js
import { useAuth } from '../context/AuthContext';
const { user, isAuthenticated, login, register, logout, updateProfile } = useAuth();
```

## Constants
```js
import { ALLOWED_SUBJECTS, DIFFICULTY_COLORS, OPTION_KEYS } from '../config/constants';
```
Never define these locally in components.

## Protected Routes
Wrap in ProtectedRoute + AppLayout:
```jsx
<Route path="/questions" element={
  <ProtectedRoute><AppLayout><QuestionFeedPage /></AppLayout></ProtectedRoute>
} />
```

## Loading States
Use LoadingSpinner component during async fetches:
```jsx
if (loading) return <LoadingSpinner />;
```

## Styling
- Tailwind CSS utility classes only
- Responsive: `md:` breakpoint for desktop, mobile-first
- Primary: indigo-600, Challenges: amber-500, Success: green, Error: red
