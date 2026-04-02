import { isAxiosError } from 'axios';

import { apiClient } from './image-to-svg';

type UploadImageApiResponse = {
  url?: string;
};

function resolveMediaMimeType(uri: string) {
  const lower = uri.toLowerCase();

  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  if (lower.endsWith('.3gp')) return 'video/3gpp';

  return 'image/jpeg';
}

async function uploadFile(fileUri: string, userId: string): Promise<string> {
  const endpoint = '/api/upload-image';
  const fileName = fileUri.split('/').pop() || 'file';
  const mimeType = resolveMediaMimeType(fileName);
  const formData = new FormData();

  formData.append('userId', userId);
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  console.log('[upload-image] request:start', {
    requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
    method: 'POST',
    userId,
    fileName,
    mimeType,
  });

  try {
    const response = await apiClient.post<UploadImageApiResponse>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
        'x-project-id': 'fastchat',
      },
    });

    const uploadedUrl = response.data?.url?.trim();

    console.log('[upload-image] request:response', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      status: response.status,
      responseData: response.data,
    });

    if (!uploadedUrl) {
      throw new Error('Upload response did not include a URL.');
    }

    console.log('[upload-image] request:success', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      uploadedUrl,
    });

    return uploadedUrl;
  } catch (error) {
    const axiosError = isAxiosError(error) ? error : null;
    const apiMessage = typeof axiosError?.response?.data === 'string'
      ? axiosError.response.data
      : undefined;

    console.error('[upload-image] request:error', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      message: axiosError?.message || (error instanceof Error ? error.message : 'Unknown error'),
      status: axiosError?.response?.status,
      responseData: axiosError?.response?.data,
      error,
    });

    throw new Error(
      apiMessage
      || axiosError?.message
      || (error instanceof Error ? error.message : 'Unable to upload image.'),
    );
  }
}

export async function uploadImageForDrawing(imageUri: string, userId: string = 'colorapp-user'): Promise<string> {
  return uploadFile(imageUri, userId);
}

export async function uploadMediaForFeedback(mediaUri: string, userId: string = 'colorapp-feedback-user'): Promise<string> {
  return uploadFile(mediaUri, userId);
}
