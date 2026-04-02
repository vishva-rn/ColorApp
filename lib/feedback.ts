import axios from 'axios';

const FEEDBACK_URL = 'https://core.deepswapper.com/send-app-feedback';

export async function sendFeedback(
  feedback: string,
  email: string,
  uid?: string,
  mediaUrl?: string,
): Promise<void> {
  const response = await axios.post(
    FEEDBACK_URL,
    {
      feedback,
      uid,
      email,
      mediaUrl,
      type: 'ColorApp',
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    },
  );

  if (response.status !== 200) {
    throw new Error('Unable to send feedback');
  }
}
