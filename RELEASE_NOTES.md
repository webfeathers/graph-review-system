# Release Notes

## [Unreleased]

### Added
- Google avatar support in user profiles
  - Added proxy endpoint to handle Google avatar authentication
  - Improved profile page to display Google profile pictures
  - Added fallback to initials when avatar is not available

### Changed
- Improved error handling in profile page
- Added proper caching for avatar images

### Fixed
- Fixed avatar loading issues with Google profile pictures
- Improved error handling in API endpoints

## [0.1.1] - 2024-04-21

### Fixed
- Fixed @mention dropdown positioning in comments
  - Improved positioning calculation to handle text wrapping
  - Centered dropdown within textarea
  - Added viewport boundary checking

## [0.1.0] - 2024-04-21

### Added
- Initial release of the Graph Review System
- User authentication with Google OAuth
- Basic profile management
- Review creation and management
- Comment system
- Activity feed
- Points and badges system
- Role-based access control 