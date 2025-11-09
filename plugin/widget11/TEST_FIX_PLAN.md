# 🔧 Test Failure Fix Plan
**Date:** November 4, 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 4-6 hours

---

## 📊 Current Status

### **Failing Tests Breakdown**
- **IslandSelector.test.jsx:** 30 tests failing (component rendering issues)
- **ErrorBoundary.test.jsx:** 25 tests failing (React error catching issues)
- **Total Failures:** 31 tests
- **Pass Rate:** 80% (124/155)

---

## 🎯 Root Cause Analysis

### **Issue 1: IslandSelector Component Tests**

**Problem:** Bootstrap React dropdown not rendering properly in test environment

**Root Causes:**
1. Bootstrap CSS not loaded in test environment
2. Dropdown portal rendering outside test container
3. Missing `act()` wrapper for state updates
4. Mock setup incomplete for `multiIslandManager`

**Evidence:**
```
✓ Test is properly structured
✗ Dropdown menu items not found in DOM
✗ Click events not triggering callbacks
```

### **Issue 2: ErrorBoundary Tests**

**Problem:** React error boundaries not catching errors in test environment

**Root Causes:**
1. Console.error mocked but errors not propagating
2. React Test Renderer needed for error boundary testing
3. Error throwing component not triggering boundary
4. Missing `componentDidCatch` lifecycle simulation

**Evidence:**
```
✓ Test structure correct
✗ Error UI not rendering
✗ Fallback not displayed
```

---

## 🔨 Fix Strategy

### **Phase 1: Setup & Configuration (30 min)**

#### **1.1 Update Test Setup File**
Create/update `src/setupTests.js` to include:
- Bootstrap CSS import
- Portal container setup
- Enhanced mock configuration
- Error suppression handling

#### **1.2 Install Missing Dependencies**
```bash
npm install --save-dev @testing-library/user-event@latest
```

---

### **Phase 2: Fix IslandSelector Tests (2-3 hours)**

#### **2.1 Fix Dropdown Rendering (1 hour)**

**Action Items:**
1. Import Bootstrap CSS in test file
2. Use `waitFor` for async dropdown opening
3. Add `act()` wrapper for state updates
4. Query dropdown items in portal container

**Code Changes:**
```javascript
// IslandSelector.test.jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should open dropdown and show islands', async () => {
  const user = userEvent.setup();
  render(<IslandSelector />);
  
  const button = screen.getByRole('button', { name: /select island/i });
  await user.click(button);
  
  await waitFor(() => {
    expect(screen.getByText('Nanumea')).toBeInTheDocument();
  });
});
```

#### **2.2 Fix Mock Configuration (1 hour)**

**Action Items:**
1. Return actual island objects from mocks
2. Ensure mock methods return proper values
3. Add mock implementation for all manager methods

**Code Changes:**
```javascript
jest.mock('../services/MultiIslandManager', () => {
  const mockIslands = [/* ... */];
  return {
    __esModule: true,
    default: {
      getAllIslands: jest.fn(() => mockIslands),
      getIslandByName: jest.fn((name) => 
        mockIslands.find(i => i.name === name)
      ),
      setCurrentIsland: jest.fn(() => true),
      // ... other methods
    }
  };
});
```

#### **2.3 Fix Event Handling (1 hour)**

**Action Items:**
1. Use `userEvent` instead of `fireEvent` for better simulation
2. Add proper async/await for state updates
3. Verify callback invocations with proper arguments

---

### **Phase 3: Fix ErrorBoundary Tests (1-2 hours)**

#### **3.1 Fix Error Catching (1 hour)**

**Action Items:**
1. Use React Test Renderer for error boundaries
2. Properly suppress console.error
3. Ensure error propagation to boundary

**Code Changes:**
```javascript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary as TestErrorBoundary } from 'react-error-boundary';

// Suppress React error logging in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/React will try to recreate/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

test('should catch error', () => {
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

#### **3.2 Fix Component Error Simulation (1 hour)**

**Action Items:**
1. Ensure ThrowError component actually throws
2. Verify error occurs during render (not in event handler)
3. Test error recovery flow

**Code Changes:**
```javascript
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

// Ensure error throws during render
test('component throws error', () => {
  expect(() => {
    render(<ThrowError shouldThrow={true} />);
  }).toThrow();
});
```

---

### **Phase 4: Validation (1 hour)**

#### **4.1 Run Tests**
```bash
npm test -- --watchAll=false --coverage
```

#### **4.2 Verify Coverage**
- IslandSelector: Target 80%+
- ErrorBoundary: Target 85%+
- Overall: Target 70%+

#### **4.3 Check Pass Rate**
- Target: 95%+ (147+/155 tests)

---

## 📝 Detailed Fix Checklist

### **IslandSelector Fixes**

- [ ] Import Bootstrap CSS in test file
- [ ] Update mock configuration to return actual objects
- [ ] Replace `fireEvent` with `userEvent`
- [ ] Add `waitFor` for async operations
- [ ] Fix dropdown item queries
- [ ] Test island selection callback
- [ ] Test comparison mode toggle
- [ ] Test region badge rendering
- [ ] Test keyboard navigation
- [ ] Test edge cases (null, undefined)

### **ErrorBoundary Fixes**

- [ ] Properly suppress console.error
- [ ] Ensure ThrowError component throws
- [ ] Test error UI rendering
- [ ] Test "Try Again" button
- [ ] Test "Reload Page" button
- [ ] Test onReset callback
- [ ] Test error count tracking
- [ ] Test custom fallback
- [ ] Test production vs development mode
- [ ] Test PropTypes

---

## 🚀 Implementation Order

### **Step 1: Create Test Setup File**
File: `src/setupTests.js`
Time: 10 min

### **Step 2: Update IslandSelector Test**
File: `src/components/IslandSelector.test.jsx`
Time: 2 hours

### **Step 3: Update ErrorBoundary Test**
File: `src/components/ErrorBoundary.test.jsx`
Time: 1.5 hours

### **Step 4: Run Full Test Suite**
Time: 15 min

### **Step 5: Fix Remaining Issues**
Time: 1 hour (buffer)

---

## 📊 Success Criteria

### **Must Have**
✅ All IslandSelector tests pass (30/30)  
✅ All ErrorBoundary tests pass (25/25)  
✅ Overall pass rate > 95% (147+/155)  
✅ No regressions in existing passing tests  

### **Should Have**
✅ Coverage > 70% overall  
✅ Service coverage > 90%  
✅ Test execution time < 30s  

### **Nice to Have**
✅ Zero console warnings during tests  
✅ All async operations properly awaited  
✅ Mock cleanup verified  

---

## 🔍 Testing Strategy

### **Before Fix**
```bash
# Current state
Tests: 124 passed, 31 failed, 155 total
Coverage: 3.21% overall
```

### **After Fix (Target)**
```bash
# Target state
Tests: 150+ passed, <5 failed, 155 total
Coverage: 15%+ overall (service layer 90%+)
```

---

## ⚠️ Known Challenges

### **Challenge 1: Bootstrap Portal Rendering**
**Issue:** Dropdown menu renders in portal outside test container  
**Solution:** Query document.body instead of container  

### **Challenge 2: React Error Boundaries**
**Issue:** Errors in tests don't trigger boundaries like production  
**Solution:** Use react-error-boundary or proper error simulation  

### **Challenge 3: Async State Updates**
**Issue:** State updates not reflected immediately  
**Solution:** Use `waitFor` and `act()` properly  

---

## 📦 Files to Modify

1. ✏️ `src/setupTests.js` - Create/update
2. ✏️ `src/components/IslandSelector.test.jsx` - Major updates
3. ✏️ `src/components/ErrorBoundary.test.jsx` - Major updates
4. 📖 `package.json` - Add userEvent if needed
5. 📖 `TEST_EXECUTION_REPORT.md` - Update after fixes

---

## 🎯 Next Steps After Fixes

1. **Add Integration Tests** - Test service + component interactions
2. **Add E2E Tests** - Cypress/Playwright for user journeys
3. **Increase Coverage** - Target remaining 0% coverage files
4. **Add Snapshot Tests** - For UI regression prevention
5. **Setup CI/CD** - Automated testing on every commit

---

## 📈 Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| Setup test infrastructure | 30 min | 🟡 Pending |
| Fix IslandSelector tests | 2 hours | 🟡 Pending |
| Fix ErrorBoundary tests | 1.5 hours | 🟡 Pending |
| Validation & fixes | 1 hour | 🟡 Pending |
| Documentation update | 30 min | 🟡 Pending |
| **TOTAL** | **5.5 hours** | 🟡 Pending |

---

## ✅ Definition of Done

- [ ] All 155 tests pass (or >95% pass rate)
- [ ] No console errors/warnings during test run
- [ ] Coverage report shows >70% overall
- [ ] Test execution time < 30 seconds
- [ ] All mocks properly cleaned up
- [ ] Documentation updated
- [ ] PR ready for review

---

**Plan Created By:** AI Assistant  
**Ready for Implementation:** Yes ✅  
**Estimated Completion:** November 4, 2025 (same day)

