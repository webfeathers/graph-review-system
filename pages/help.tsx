import type { NextPage } from 'next';
import { withRoleProtection } from '../components/withRoleProtection';
import Link from 'next/link';
import { BadgeType, POINTS_PER_REVIEW, POINTS_PER_COMMENT, POINTS_PER_REVIEW_APPROVAL, POINTS_PER_TASK_COMPLETION } from '../constants';
import BadgeDisplay from '../components/BadgeDisplay';

const HelpPage: NextPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Help & Documentation</h1>

      {/* Table of Contents */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Getting Started</h3>
            <ul className="space-y-1">
              <li><a href="#overview" className="text-blue-600 hover:text-blue-800">Overview</a></li>
              <li><a href="#getting-started" className="text-blue-600 hover:text-blue-800">Getting Started</a></li>
              <li><a href="#points-system" className="text-blue-600 hover:text-blue-800">Points & Badges</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Features</h3>
            <ul className="space-y-1">
              <li><a href="#creating-reviews" className="text-blue-600 hover:text-blue-800">Creating Reviews</a></li>
              <li><a href="#review-process" className="text-blue-600 hover:text-blue-800">Review Process</a></li>
              <li><a href="#kantata-integration" className="text-blue-600 hover:text-blue-800">Kantata Integration</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Overview Section */}
        <section id="overview" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 mb-4">
              The Graph Review System is designed to streamline the process of reviewing and managing graph-based projects. 
              It replaces the previous Google Forms and presentation-based workflow with a more efficient, integrated solution.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Create Reviews</h3>
                <p className="text-blue-800 text-sm">Submit graph reviews with all necessary details and documentation</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Track Progress</h3>
                <p className="text-green-800 text-sm">Monitor review status and track required changes</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Earn Rewards</h3>
                <p className="text-purple-800 text-sm">Gain points and badges for your contributions</p>
              </div>
            </div>
          </div>
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
              <p className="mb-4">
                As you contribute to the review system, you'll earn points and badges that recognize your achievements:
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Points System</h4>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>{POINTS_PER_REVIEW} points per review submitted</li>
                    <li>{POINTS_PER_COMMENT} points per comment made</li>
                    <li>{POINTS_PER_REVIEW_APPROVAL} points per review approved</li>
                    <li>{POINTS_PER_TASK_COMPLETION} points per task completed</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Badges</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Points-Based Badges</h5>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.EXPERT_REVIEWER} size="sm" />
                          <span className="ml-2 text-gray-600">Earn 100+ points through your contributions</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.ACTIVE_REVIEWER} size="sm" />
                          <span className="ml-2 text-gray-600">Earn 50+ points through your contributions</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.CONTRIBUTOR} size="sm" />
                          <span className="ml-2 text-gray-600">Earn 10+ points through your contributions</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Review-Based Badges</h5>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.REVIEW_MASTER} size="sm" />
                          <span className="ml-2 text-gray-600">Complete 20+ reviews</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.QUALITY_REVIEWER} size="sm" />
                          <span className="ml-2 text-gray-600">Have 5+ reviews approved</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.HELPFUL_REVIEWER} size="sm" />
                          <span className="ml-2 text-gray-600">Receive 10+ helpful votes on your comments</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Comment-Based Badges</h5>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.ENGAGED_COMMENTER} size="sm" />
                          <span className="ml-2 text-gray-600">Make 20+ comments</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.INSIGHTFUL_COMMENTER} size="sm" />
                          <span className="ml-2 text-gray-600">Have 5+ comments marked as helpful</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Special Achievement Badges</h5>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.EARLY_ADOPTER} size="sm" />
                          <span className="ml-2 text-gray-600">Join the system in its first month</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.TEAM_PLAYER} size="sm" />
                          <span className="ml-2 text-gray-600">Participate in 5+ different reviews</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.CONSISTENT_CONTRIBUTOR} size="sm" />
                          <span className="ml-2 text-gray-600">Maintain activity for 3+ months</span>
                        </li>
                        <li className="flex items-start">
                          <BadgeDisplay badge={BadgeType.ICE_BREAKER} size="sm" />
                          <span className="ml-2 text-gray-600">Be the first to comment on a review</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

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
                    <li>The review will be marked as "Needs Work" if changes are required</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Needs Work</p>
                  <p className="ml-4">Changes or additional information required. In this stage:</p>
                  <ul className="list-disc list-inside ml-8 mt-2">
                    <li>Reviewers have identified issues that need to be addressed</li>
                    <li>You must complete any assigned tasks</li>
                    <li>You can make the requested changes</li>
                    <li>Once changes are made, you can resubmit for review by changing the status back to "Submitted"</li>
                    <li>The review will return to "In Review" for further evaluation</li>
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
                    <li>You will receive points for the approved review</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Submitting a Review</h3>
              <p className="text-gray-600 mb-4">
                To submit a review for approval:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Complete all required fields in the review form</li>
                <li>Click the "Submit Review" button</li>
                <li>If there are any validation errors:
                  <ul className="list-disc list-inside ml-6 mt-2">
                    <li>The page will scroll to show the error message at the top</li>
                    <li>Required fields with errors will be highlighted</li>
                    <li>Fix the errors and try submitting again</li>
                  </ul>
                </li>
                <li>Once submitted successfully:
                  <ul className="list-disc list-inside ml-6 mt-2">
                    <li>The review status will change to "Submitted"</li>
                    <li>Reviewers will be notified</li>
                    <li>The review will appear in the "In Review" section</li>
                  </ul>
                </li>
              </ol>
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

        {/* FAQ Section */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Common Questions</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How do I submit a review?</h4>
                  <p className="text-gray-600">
                    Click the "New Review" button on the Reviews page, fill in all required fields, and click "Submit Review". 
                    Make sure to include all necessary documentation and links.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">What happens after I submit a review?</h4>
                  <p className="text-gray-600">
                    Your review will be assigned to reviewers who will evaluate it. They may add comments, request changes, 
                    or approve it. You'll be notified of any updates or required actions.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How do I earn points and badges?</h4>
                  <p className="text-gray-600">
                    Points are earned through various activities like creating reviews, making comments, and completing tasks. 
                    Badges are awarded for reaching specific milestones. See the Points & Badges section for details.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Can I edit a review after submission?</h4>
                  <p className="text-gray-600">
                    Yes, you can edit your review while it's in "Submitted" or "Needs Work" status. Once approved, 
                    you'll need to create a new review for any changes.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How do I track my review's progress?</h4>
                  <p className="text-gray-600">
                    You can monitor your review's status on your dashboard. The status will update as reviewers provide feedback 
                    or request changes. You'll also receive notifications for any updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// Allow access to all authenticated users
export default withRoleProtection(HelpPage, ['Member', 'Admin']); 