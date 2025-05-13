import type { NextPage } from 'next';
import { withRoleProtection } from '../components/withRoleProtection';
import Link from 'next/link';

const HelpPage: NextPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Help & Documentation</h1>

      <div className="space-y-12">
        {/* Overview Section */}
        <section id="overview" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600 mb-4">
            The Graph Review System is designed to streamline the process of reviewing and managing graph-based projects. 
            It replaces the previous Google Forms and presentation-based workflow with a more efficient, integrated solution.
          </p>
        </section>

        {/* Getting Started Section */}
        <section id="getting-started" className="scroll-mt-20">
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
        <section id="points-system" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Points System</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Earning Points</h3>
              <p className="text-gray-600 mb-4">
                The Points system rewards active participation and contribution to the review process. You can earn points through various activities:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Creating new reviews (+10 points)</li>
                <li>Getting a review approved (+20 points)</li>
                <li>Adding comments to reviews (+5 points per comment)</li>
                <li>Receiving upvotes on your comments (+2 points per upvote)</li>
                <li>Completing review tasks (+5 points per task)</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Activity Tracking</h3>
              <p className="text-gray-600 mb-4">
                Your activities are tracked and displayed in the Recent Activity section of your dashboard. This includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Review creation and updates</li>
                <li>Comments and feedback</li>
                <li>Review approvals</li>
                <li>Points earned</li>
                <li>Badges awarded</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Points and Badges</h3>
              <p className="text-gray-600 mb-4">
                As you accumulate points, you'll earn badges that recognize your contributions:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Review Creator: Earned by creating your first review (10 points)</li>
                <li>Active Contributor: Awarded for regular participation (50 points)</li>
                <li>Review Expert: Achieved through consistent high-quality contributions (100 points)</li>
                <li>Team Player: Earned by providing valuable feedback to others (25 comments)</li>
              </ul>
              <p className="mt-4 text-gray-600">
                Your points and badges are displayed on your dashboard, showcasing your contributions to the team.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Review Tasks</h3>
              <p className="text-gray-600 mb-4">
                Reviewers can create specific tasks that must be completed before a review can be approved. Tasks help ensure all necessary changes and improvements are addressed:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Tasks can be created by reviewers during the review process</li>
                <li>Each task should be specific and actionable</li>
                <li>Tasks can include:
                  <ul className="list-disc list-inside ml-6 mt-2">
                    <li>Documentation updates</li>
                    <li>Code changes or improvements</li>
                    <li>Additional information needed</li>
                    <li>Required approvals</li>
                  </ul>
                </li>
                <li>Tasks must be marked as completed before the review can be approved</li>
                <li>Completing tasks earns points and contributes to your activity score</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Creating Reviews Section */}
        <section id="creating-reviews" className="scroll-mt-20">
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
        <section id="review-process" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Review Process</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Review Stages</h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <p className="font-medium">Draft</p>
                  <p className="ml-4">Initial state when creating a new review. In this stage:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>You can save your work without submitting</li>
                    <li>No fields are required</li>
                    <li>Only you can see and edit the review</li>
                    <li>You can change the status to Submitted when ready, but only if all required fields are completed</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Submitted</p>
                  <p className="ml-4">When you're ready to submit for review. Before changing status from Draft to Submitted, you must complete:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>Title (required)</li>
                    <li>Description (required)</li>
                    <li>Graph Name (required)</li>
                    <li>Use Case (required)</li>
                    <li>Customer Folder (required)</li>
                    <li>Handoff Link (required)</li>
                    <li>Kantata Project ID (required)</li>
                  </ul>
                  <p className="ml-4 mt-2">Optional fields (can be left empty):</p>
                  <ul className="list-disc list-inside ml-8">
                    <li>Account Name</li>
                    <li>Org ID</li>
                  </ul>
                  <p className="ml-4 mt-2 text-sm text-gray-500">
                    Note: If any required fields are missing, you'll see validation errors and won't be able to change the status to Submitted.
                  </p>
                </div>

                <div>
                  <p className="font-medium">In Review</p>
                  <p className="ml-4">Review is being evaluated by the team. In this stage:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>Reviewers can add comments and feedback</li>
                    <li>Reviewers can create tasks that need to be completed</li>
                    <li>You can still make changes based on feedback</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Needs Work</p>
                  <p className="ml-4">Changes or additional information required. In this stage:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>Reviewers have identified issues that need to be addressed</li>
                    <li>You must complete any assigned tasks</li>
                    <li>You can make the requested changes</li>
                    <li>Once changes are made, you can resubmit for review</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Approved</p>
                  <p className="ml-4">Review has been approved. In this stage:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>All required fields are complete</li>
                    <li>All tasks have been completed</li>
                    <li>Reviewers have approved the changes</li>
                    <li>The review is considered complete</li>
                  </ul>
                </div>
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
        <section id="kantata-integration" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Kantata Integration</h2>
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
        <section id="tips-and-best-practices" className="scroll-mt-20">
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
        <section id="need-help" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Need Help?</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">
              If you need additional assistance or have questions about the system, please contact your system administrator.
            </p>
          </div>
        </section>

        {/* Badges Section */}
        <section id="badges" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Badges</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Review Creator</h3>
              <p className="text-gray-600">
                Review Creator: Earned by creating your first review
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Active Contributor</h3>
              <p className="text-gray-600">
                Active Contributor: Awarded for regular participation
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Review Expert</h3>
              <p className="text-gray-600">
                Review Expert: Achieved through consistent high-quality contributions
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Team Player</h3>
              <p className="text-gray-600">
                Team Player: Earned by providing valuable feedback to others
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">
              If you have any other questions or need further assistance, please feel free to contact us.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Allow access to all authenticated users
export default withRoleProtection(HelpPage, ['Member', 'Admin']); 