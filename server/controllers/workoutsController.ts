import { Request, Response } from 'express';

export const getMyPlan = async (req: Request, res: Response) => {
  try {
    // Return a mock plan for development
    const plan = {
      today: {
        title: 'Upper Body Power',
        notes: '45 mins • Dumbbells • Assigned by your coach',
        duration: '45 min',
        videoUrl: '/uploads/sample-workout.mp4'
      },
      workout: {
        description: '4 week progressive overload program',
        sessions: [
          { name: 'Day 1 - Push', duration: '45 min', exercises: [{ name: 'Bench Press', sets: 4, reps: '8-10', notes: '' }] }
        ]
      },
      nutrition: {
        notes: 'Sample nutrition guidance'
      },
      coach: { name: 'Coach Sam', avatar: '/uploads/coach-avatar.png' }
    };

    return res.json(plan);
  } catch (err) {
    console.error('getMyPlan error', err);
    return res.status(500).json({ message: 'Could not fetch plan' });
  }
};
