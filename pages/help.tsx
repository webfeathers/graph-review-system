import type { NextPage } from 'next';
import { withRoleProtection } from '../components/withRoleProtection';
import Link from 'next/link';

const HelpPage: NextPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">How to Use the Graph Review System</h1>
      
      {/* Overview Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="text-gray-600 mb-4">
          The Graph Review System is designed to streamline the process of reviewing and managing graph-based projects. 
          It replaces the previous Google Forms and presentation-based workflow with a more efficient, integrated solution.
        </p>
      </section>

      {/* Getting Started Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">1. Sign In</h3>
            <p className="text-gray-600">
              Use your Google account to sign in to the system. This ensures secure access and proper tracking of your activities.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">2. Dashboard</h3>
            <p className="text-gray-600">
              After signing in, you'll be taken to your dashboard where you can see your review count, comments, and earned points.
              You can also view any badges you've earned for your contributions.
            </p>
          </div>
        </div>
      </section>

      {/* Points System Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Points System</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Earning Points</h3>
            <p className="text-gray-600 mb-4">
              The Points system rewards active participation and contribution to the review process. You can earn points through various activities:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Creating new reviews</li>
              <li>Providing helpful comments and feedback</li>
              <li>Completing review tasks</li>
              <li>Getting reviews approved</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Points and Badges</h3>
            <p className="text-gray-600 mb-4">
              As you accumulate points, you'll earn badges that recognize your contributions:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Review Creator: Earned by creating your first review</li>
              <li>Active Contributor: Awarded for regular participation</li>
              <li>Review Expert: Achieved through consistent high-quality contributions</li>
              <li>Team Player: Earned by providing valuable feedback to others</li>
            </ul>
            <p className="mt-4 text-gray-600">
              Your points and badges are displayed on your profile page, showcasing your contributions to the team.
            </p>
          </div>
        </div>
      </section>

      {/* Creating Reviews Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Creating Reviews</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">New Review</h3>
            <p className="text-gray-600 mb-4">
              To create a new review:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Click the "New Review" button from the Reviews page</li>
              <li>Fill in the required information:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>Title and Description</li>
                  <li>Account Name and OrgID</li>
                  <li>Graph Name and Use Case</li>
                  <li>Customer Folder and Handoff Link</li>
                  <li>Kantata Project ID</li>
                </ul>
              </li>
              <li>Submit the review for approval</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Review Process Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Review Process</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Review Statuses</h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Submitted:</span> Initial state when a review is created</p>
              <p><span className="font-medium">In Review:</span> Review is being evaluated</p>
              <p><span className="font-medium">Needs Work:</span> Changes or additional information required</p>
              <p><span className="font-medium">Approved:</span> Review has been approved</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Comments and Feedback</h3>
            <p className="text-gray-600">
              Use the comments section to provide feedback on reviews. Comments can be used to:
            </p>
            <ul className="list-disc list-inside ml-6 mt-2 text-gray-600">
              <li>Request additional information</li>
              <li>Provide suggestions for improvement</li>
              <li>Ask questions about the graph implementation</li>
              <li>Share relevant documentation or resources</li>
              <li>Use @mentions to notify specific team members about your comment</li>
            </ul>
            <p className="mt-4 text-gray-600">
              <span className="font-medium">@mentions:</span> Type @ followed by a team member's name to mention them in your comment. 
              They will receive a notification about your comment and can respond directly. This is particularly useful when:
            </p>
            <ul className="list-disc list-inside ml-6 mt-2 text-gray-600">
              <li>You need specific input from a team member</li>
              <li>You want to draw attention to a particular aspect of the review</li>
              <li>You're assigning a task or requesting action from someone</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Admin Features Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Admin Features</h2>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Kantata Integration</h3>
            <p className="text-gray-600 mb-4">
              Admins can access the Kantata Projects page to:
            </p>
            <ul className="list-disc list-inside ml-6 text-gray-600">
              <li>View all active Kantata projects</li>
              <li>Link reviews to Kantata projects</li>
              <li>Monitor project status and review status</li>
              <li>Receive notifications for Live/not Approved mismatches</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tips and Best Practices */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tips and Best Practices</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Always provide detailed descriptions and use cases</li>
            <li>Include relevant links to documentation and resources</li>
            <li>Keep comments constructive and specific</li>
            <li>Update review status promptly when changes are made</li>
            <li>Use the search and filter features to find specific reviews</li>
          </ul>
        </div>
      </section>

      {/* Need Help? */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">
            If you need additional assistance or have questions about the system, please contact your system administrator.
          </p>
        </div>
      </section>
    </div>
  );
};

// Allow access to all authenticated users
export default withRoleProtection(HelpPage, ['Member', 'Admin']); 