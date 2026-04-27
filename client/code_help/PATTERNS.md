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
  const { data } = await apiClient.post('/auth/firebase', { firebaseIdToken });
} catch (err) {
  setError(err.response?.data?.error || 'Fallback message');
}
```
Always read `err.response?.data?.error` (not `.message`).

## Auth Context
```js
import { useAuth } from '../context/AuthContext';
const { user, isAuthenticated, isOnboarded, signInWithGoogle, logout, updateProfile } = useAuth();
```

- `signInWithGoogle()` — triggers Firebase popup, exchanges ID token for app JWT, returns user object
- `logout()` — signs out of Firebase + clears localStorage token
- `isOnboarded` — derived from `user?.isOnboarded`; used by ProtectedRoute and LoginPage

## Google Sign-In Pattern
```js
const handleGoogleSignIn = async () => {
  try {
    const signedInUser = await signInWithGoogle();
    // signInWithGoogle returns null if popup was closed — handle gracefully
    if (!signedInUser) return;
    navigate(signedInUser.isOnboarded ? '/questions' : '/onboarding', { replace: true });
  } catch (err) {
    setError(err.response?.data?.error || 'Sign-in failed. Please try again.');
  }
};
```

## Constants
```js
import { ALLOWED_SUBJECTS, DIFFICULTY_COLORS, OPTION_KEYS } from '../config/constants';
```
Never define these locally in components.

## useColleges Hook
Fetches `/api/colleges` once and caches in module memory (same pattern as `useTaxonomy`).

```js
import { useColleges } from '../hooks/useColleges';
const { colleges, loading, error } = useColleges();
```

- `colleges` — `string[]` of college name strings
- `loading` — bool, true until first fetch resolves
- `error` — string | null
- Module-level `_cache` and `_promise` prevent duplicate requests across re-renders
- Use with `SearchableSelect` for college name fields; free-text fallback is built into `SearchableSelect`

## Protected Routes
Wrap in ProtectedRoute + AppLayout:
```jsx
<Route path="/questions" element={
  <ProtectedRoute><AppLayout><QuestionFeedPage /></AppLayout></ProtectedRoute>
} />
```

ProtectedRoute checks:
1. `loading` → show `<LoadingSpinner />`
2. `!isAuthenticated` → redirect to `/`
3. `!isOnboarded` → redirect to `/onboarding`
4. Otherwise → render children

## Loading States
Use LoadingSpinner component during async fetches:
```jsx
if (loading) return <LoadingSpinner />;
```

## Styling
- Tailwind CSS utility classes only
- Responsive: `md:` breakpoint for desktop, mobile-first
- Primary: indigo-600, Challenges: amber-500, Success: green, Error: red
