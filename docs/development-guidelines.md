# Development Guidelines

## Core Principles

### 1. Incremental Changes
- Make one change at a time
- Test each change before moving to the next
- Keep changes small and focused
- Document what you're changing and why

### 2. Database Query Stability
- Document current query structure before making changes
- Test queries in isolation before integrating
- Be careful with:
  - Join types (`!inner` vs `!left`)
  - Foreign key relationships
  - Nested queries (comments, votes, etc.)
- Verify data integrity after query changes

## Testing Checklist

### Before Making Changes
- [ ] Document current behavior
- [ ] Document current query structure
- [ ] Test current functionality
- [ ] Identify potential impact areas

### During Development
- [ ] Make one change at a time
- [ ] Test the change in isolation
- [ ] Document the change
- [ ] Verify no regressions in existing functionality

### For Database Queries
- [ ] Test query in Supabase dashboard first
- [ ] Verify join types are correct
- [ ] Check foreign key relationships
- [ ] Test with edge cases (empty results, null values)
- [ ] Verify data transformation

### For API Endpoints
- [ ] Test with valid data
- [ ] Test with invalid data
- [ ] Test error handling
- [ ] Verify response format
- [ ] Check authentication/authorization

### For Frontend Components
- [ ] Test with loading state
- [ ] Test with error state
- [ ] Test with empty state
- [ ] Test with valid data
- [ ] Verify UI updates correctly

## Common Pitfalls to Avoid

### Database Queries
1. Changing join types without testing
2. Modifying foreign key relationships without updating related code
3. Adding/removing fields without updating type definitions
4. Changing query structure without testing edge cases

### API Changes
1. Modifying response format without updating consumers
2. Changing error handling without testing
3. Adding new endpoints without proper documentation
4. Modifying authentication/authorization without testing

### Frontend Changes
1. Making multiple changes at once
2. Not testing all possible states
3. Not handling loading/error states
4. Not updating type definitions

## Best Practices

### Code Organization
- Keep related code together
- Use consistent naming conventions
- Document complex logic
- Keep functions small and focused

### Error Handling
- Use consistent error formats
- Handle all possible error cases
- Provide meaningful error messages
- Log errors appropriately

### Testing
- Write tests for new functionality
- Test edge cases
- Test error conditions
- Verify data integrity

### Documentation
- Document API changes
- Document database changes
- Update type definitions
- Keep documentation up to date

## Review Process

### Before Submitting Changes
- [ ] Run all tests
- [ ] Check for linting errors
- [ ] Verify documentation is updated
- [ ] Test all affected functionality
- [ ] Review changes with team

### During Code Review
- [ ] Verify changes follow guidelines
- [ ] Check for potential issues
- [ ] Verify testing checklist is complete
- [ ] Review documentation updates
- [ ] Check for security concerns 