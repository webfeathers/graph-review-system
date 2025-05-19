import React, { useState, useEffect } from 'react';
import { Task, TaskWithProfiles, ReviewWithProfile } from '@/types/supabase';
import { useAuth } from './AuthProvider';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Form, TextInput, TextArea, SelectInput, SubmitButton } from './form/FormComponents';

interface TaskListProps {
  reviewId: string;
  reviewTitle: string;
  review: ReviewWithProfile;
}

export default function TaskList({ reviewId, reviewTitle, review }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Handle hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#task-')) {
        const taskId = hash.replace('#task-', '');
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth' });
          taskElement.classList.add('bg-blue-50');
          setTimeout(() => {
            taskElement.classList.remove('bg-blue-50');
          }, 2000);
        }
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Fetch tasks for this review
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/tasks?reviewId=${reviewId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data || []);
      } else {
        toast.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [reviewId]);

  // Create a new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reviewId,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
          dueDate: newTaskDueDate || null,
          assignedTo: review.projectLeadId || null,
          priority: newTaskPriority,
          status: 'pending'
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task created successfully');
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskDueDate('');
        setNewTaskPriority('medium');
        // Refresh the task list
        await fetchTasks();
      } else {
        toast.error(data.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task updated successfully');
        fetchTasks();
      } else {
        toast.error(data.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task deleted successfully');
        fetchTasks();
      } else {
        toast.error(data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading tasks...</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Tasks</h2>
      {/* Create Task Form */}
      <div className="bg-white p-6">
        <Form onSubmit={handleCreateTask} className="space-y-4">
          <TextInput
            id="title"
            name="title"
            label="Task Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title"
            required
          />
          
          <TextArea
            id="description"
            name="description"
            label="Description"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Enter task description"
            rows={3}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="dueDate"
              name="dueDate"
              label="Due Date"
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
            />
            
            <SelectInput
              id="priority"
              name="priority"
              label="Priority"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
              ]}
            />
          </div>

          <div className="flex justify-end">
            <SubmitButton
              isSubmitting={isSubmitting}
              label="Create Task"
              submittingLabel="Creating..."
            />
          </div>
        </Form>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet. Create one above!</p>
        ) : (
          <div className="space-y-4">
            {tasks
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((task) => (
              <div
                key={task.id}
                id={`task-${task.id}`}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Assigned to: {task.assignedToUser?.name || 'Unassigned'}</p>
                    <p>Created by: {task.createdByUser?.name}</p>
                    {task.dueDate && (
                      <p>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    )}
                    <p>Priority: {task.priority}</p>
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 