# Review Page Development Checklist

## Review API Endpoint (`pages/api/reviews/[id].ts`)

### Query Structure
- [ ] Verify join types for:
  - `user:profiles!fk_reviews_user`
  - `projectLead:profiles!fk_project_lead`
  - `comments:comments!left`
  - `votes:comment_votes!left`
- [ ] Test query with:
  - Review with no comments
  - Review with comments but no votes
  - Review with comments and votes
  - Review with no project lead
  - Review with project lead

### Response Format
- [ ] Maintain consistent format:
  ```typescript
  {
    success: boolean;
    data?: ReviewWithProfile;
    error?: string;
  }
  ```
- [ ] Test error responses:
  - Review not found
  - Database error
  - Authentication error
  - Authorization error

### Data Transformation
- [ ] Verify all fields are correctly transformed:
  - `user_id` → `userId`
  - `created_at` → `createdAt`
  - `updated_at` → `updatedAt`
  - `account_name` → `accountName`
  - etc.
- [ ] Test comment transformation:
  - User information
  - Vote counts
  - User votes

## Review Page Component (`pages/reviews/[id].tsx`)

### Data Fetching
- [ ] Test loading state
- [ ] Test error state
- [ ] Test successful data load
- [ ] Verify authentication check
- [ ] Test redirect to login

### State Management
- [ ] Verify review state updates
- [ ] Verify comments state updates
- [ ] Test status updates
- [ ] Test project lead updates

### UI States
- [ ] Test loading spinner
- [ ] Test error display
- [ ] Test empty state
- [ ] Test with all review data
- [ ] Test with partial review data

### User Interactions
- [ ] Test status change
- [ ] Test project lead change
- [ ] Test comment addition
- [ ] Test comment voting
- [ ] Test edit button visibility

## Common Issues to Watch For

### Data Fetching
1. Incorrect join types causing missing data
2. Missing error handling
3. Incorrect data transformation
4. Authentication/authorization issues

### UI Updates
1. State not updating correctly
2. Loading states not showing
3. Error states not handled
4. Missing data not handled gracefully

### Performance
1. Unnecessary re-renders
2. Multiple data fetches
3. Large data transformations
4. Memory leaks

## Testing Scenarios

### Happy Path
1. Load review with all data
2. Update review status
3. Change project lead
4. Add comment
5. Vote on comment

### Error Cases
1. Review not found
2. Network error
3. Authentication error
4. Authorization error
5. Invalid data

### Edge Cases
1. Review with no comments
2. Review with no project lead
3. Review with no user data
4. Review with invalid data
5. Review with missing fields 