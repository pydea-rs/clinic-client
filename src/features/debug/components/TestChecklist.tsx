import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';

interface TestScenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
}

interface TestCategory {
  id: string;
  title: string;
  role: string;
  scenarios: TestScenario[];
}

const testCategories: TestCategory[] = [
  {
    id: 'patient',
    title: 'Patient Workflows',
    role: 'PATIENT',
    scenarios: [
      {
        id: 'patient-register',
        title: 'Patient Registration',
        description: 'Register a new patient account',
        steps: [
          'Navigate to /auth',
          'Fill in firstname, lastname, email, password',
          'Select role: PATIENT',
          'Click Register',
        ],
        expectedResult: 'User is registered and logged in, redirected to /ai',
      },
      {
        id: 'patient-profile',
        title: 'Patient Profile Creation',
        description: 'Create and update patient medical profile',
        steps: [
          'Navigate to /patient/profile',
          'Fill in date of birth, gender, blood type',
          'Add medical history, allergies, medications',
          'Click Save',
        ],
        expectedResult: 'Profile saved successfully, data persists on refresh',
      },
      {
        id: 'ai-chat',
        title: 'AI Chat & SOAP Generation',
        description: 'Chat with AI and generate SOAP note',
        steps: [
          'Navigate to /ai',
          'Start conversation with symptoms',
          'Answer AI questions about symptoms',
          'Wait for SOAP generation event',
        ],
        expectedResult: 'SOAP note generated, visible in /patient/soaps',
      },
      {
        id: 'consultation-create',
        title: 'Create Consultation',
        description: 'Create consultation with doctor',
        steps: [
          'Navigate to /patient/consultations/create',
          'Select doctor from list',
          'Select SOAP note (optional)',
          'Submit consultation request',
        ],
        expectedResult: 'Consultation created with CREATED status',
      },
      {
        id: 'booking',
        title: 'Book Appointment',
        description: 'Book appointment with doctor',
        steps: [
          'Navigate to /slots/:doctorId',
          'Select date and view available slots',
          'Select slot and duration',
          'Confirm booking',
        ],
        expectedResult: 'Appointment booked, visible in /appointments',
      },
      {
        id: 'review-create',
        title: 'Create Review',
        description: 'Write review for doctor after completed consultation',
        steps: [
          'Complete a consultation first',
          'Navigate to /doctor/:id/review',
          'Rate doctor (1-5 stars)',
          'Write review text',
          'Submit review',
        ],
        expectedResult: 'Review created, visible in doctor profile reviews',
      },
      {
        id: 'chat-patient',
        title: 'Human-to-Human Chat',
        description: 'Chat with doctor in real-time',
        steps: [
          'Navigate to /chat',
          'Create or open chat with doctor',
          'Send messages',
          'Test typing indicators',
          'Test read receipts',
        ],
        expectedResult: 'Messages sent/received in real-time, presence indicators work',
      },
    ],
  },
  {
    id: 'doctor',
    title: 'Doctor Workflows',
    role: 'DOCTOR',
    scenarios: [
      {
        id: 'doctor-register',
        title: 'Doctor Registration',
        description: 'Register a new doctor account',
        steps: [
          'Navigate to /auth',
          'Fill in firstname, lastname, email, password',
          'Select role: DOCTOR',
          'Click Register',
        ],
        expectedResult: 'User is registered and logged in',
      },
      {
        id: 'doctor-profile',
        title: 'Doctor Profile Creation',
        description: 'Create doctor professional profile',
        steps: [
          'Navigate to /doctor/profile',
          'Fill in specialty, bio, clinic location',
          'Add visit methods and types',
          'Set started date',
          'Click Save',
        ],
        expectedResult: 'Profile saved, doctor appears in public listing after verification',
      },
      {
        id: 'doctor-documents',
        title: 'Upload Documents',
        description: 'Upload verification documents',
        steps: [
          'Navigate to /doctor/documents',
          'Select document type (LICENSE, CERTIFICATE, ID)',
          'Upload file (PDF, JPG, PNG)',
          'Submit',
        ],
        expectedResult: 'Document uploaded, status PENDING, visible in list',
      },
      {
        id: 'consultation-decide',
        title: 'Review & Decide Consultation',
        description: 'Doctor reviews SOAP and decides visit method',
        steps: [
          'Navigate to /consultations',
          'Open consultation with PENDING_DOCTOR_REVIEW status',
          'Review SOAP note',
          'Select decision (ACCEPT/REJECT)',
          'Select visit method (TEXT_CHAT/VOICE_CALL/VIDEO_CALL)',
          'Submit decision',
        ],
        expectedResult: 'Consultation status changes to DOCTOR_DECIDED',
      },
      {
        id: 'consultation-complete',
        title: 'Complete Consultation',
        description: 'Doctor completes consultation',
        steps: [
          'Navigate to /consultations',
          'Open consultation with IN_PROGRESS status',
          'Fill in notes and summary',
          'Set follow-up needed flag',
          'Submit completion',
        ],
        expectedResult: 'Consultation status changes to COMPLETED',
      },
      {
        id: 'scheduling-availability',
        title: 'Set Availability',
        description: 'Configure weekly availability',
        steps: [
          'Navigate to /doctor/scheduling/availability',
          'Set hours for each day of week',
          'Save availability',
        ],
        expectedResult: 'Availability saved, slots generated for patients',
      },
      {
        id: 'scheduling-durations',
        title: 'Configure Slot Durations',
        description: 'Set appointment durations and prices',
        steps: [
          'Navigate to /doctor/scheduling/durations',
          'Add duration (e.g., 30 minutes)',
          'Set price and label',
          'Mark as active',
          'Save',
        ],
        expectedResult: 'Duration saved, available for booking',
      },
      {
        id: 'chat-doctor',
        title: 'Chat with Patient',
        description: 'Real-time chat with patient',
        steps: [
          'Navigate to /doctor/chat',
          'Open chat with patient',
          'Send messages',
          'Test edit/delete messages',
          'Test presence indicators',
        ],
        expectedResult: 'Messages sent/received, edit/delete works, presence visible',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin Workflows',
    role: 'ADMIN',
    scenarios: [
      {
        id: 'admin-stats',
        title: 'View Dashboard Stats',
        description: 'View system statistics',
        steps: [
          'Navigate to /admin',
          'View stats cards',
        ],
        expectedResult: 'Stats displayed: total users, doctors, patients, consultations, reviews',
      },
      {
        id: 'admin-users',
        title: 'Manage Users',
        description: 'View and manage user accounts',
        steps: [
          'Navigate to /admin/users',
          'Search/filter users',
          'Edit user details',
          'Deactivate user',
        ],
        expectedResult: 'User list displayed, actions work correctly',
      },
      {
        id: 'admin-verify-doctor',
        title: 'Verify Doctor',
        description: 'Review and verify doctor documents',
        steps: [
          'Navigate to /admin/verifications',
          'View pending doctors',
          'Click on doctor to review documents',
          'Approve or reject with reason',
        ],
        expectedResult: 'Doctor verification status updated, doctor notified',
      },
      {
        id: 'admin-moderate-review',
        title: 'Moderate Reviews',
        description: 'Delete inappropriate reviews',
        steps: [
          'Navigate to /admin/reviews',
          'View all reviews',
          'Delete inappropriate review',
        ],
        expectedResult: 'Review deleted, no longer visible',
      },
    ],
  },
  {
    id: 'superadmin',
    title: 'Superadmin Workflows',
    role: 'SUPERADMIN',
    scenarios: [
      {
        id: 'promote-admin',
        title: 'Promote User to Admin',
        description: 'Grant admin privileges to user',
        steps: [
          'Navigate to /admin/users',
          'Find user to promote',
          'Click Promote to Admin',
          'Confirm action',
        ],
        expectedResult: 'User promoted, isAdmin flag set to true',
      },
      {
        id: 'demote-admin',
        title: 'Demote Admin to User',
        description: 'Remove admin privileges',
        steps: [
          'Navigate to /admin/users',
          'Find admin to demote',
          'Click Demote',
          'Confirm action',
        ],
        expectedResult: 'Admin demoted, isAdmin flag set to false',
      },
    ],
  },
];

export const TestChecklist: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['patient']));
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleScenario = (scenarioId: string) => {
    const newCompleted = new Set(completedScenarios);
    if (newCompleted.has(scenarioId)) {
      newCompleted.delete(scenarioId);
    } else {
      newCompleted.add(scenarioId);
    }
    setCompletedScenarios(newCompleted);
  };

  const getCategoryProgress = (category: TestCategory) => {
    const completed = category.scenarios.filter(s => completedScenarios.has(s.id)).length;
    return { completed, total: category.scenarios.length };
  };

  const getTotalProgress = () => {
    const total = testCategories.reduce((sum, cat) => sum + cat.scenarios.length, 0);
    const completed = testCategories.reduce(
      (sum, cat) => sum + cat.scenarios.filter(s => completedScenarios.has(s.id)).length,
      0
    );
    return { completed, total };
  };

  const totalProgress = getTotalProgress();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Manual Test Checklist</h2>
        <p className="text-gray-600 mb-4">
          Comprehensive testing scenarios for all roles and features
        </p>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Progress: {totalProgress.completed} / {totalProgress.total} scenarios
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(totalProgress.completed / totalProgress.total) * 100}%` }}
            />
          </div>
          <button
            onClick={() => setCompletedScenarios(new Set())}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {testCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const progress = getCategoryProgress(category);

          return (
            <div key={category.id} className="border rounded-lg">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{category.title}</div>
                    <div className="text-sm text-gray-500">
                      Role: {category.role} • {progress.completed}/{progress.total} completed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    {Math.round((progress.completed / progress.total) * 100)}%
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t divide-y">
                  {category.scenarios.map((scenario) => {
                    const isCompleted = completedScenarios.has(scenario.id);

                    return (
                      <div key={scenario.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleScenario(scenario.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{scenario.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                            
                            <div className="mb-3">
                              <div className="text-sm font-medium text-gray-700 mb-1">Steps:</div>
                              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                {scenario.steps.map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">Expected Result:</div>
                              <p className="text-sm text-gray-600">{scenario.expectedResult}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
