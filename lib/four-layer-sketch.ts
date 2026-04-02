import { isAxiosError } from 'axios';

import { apiClient } from './image-to-svg';

type FourLayerSketchApiResponse = {
  id?: number;
  generated_images?: string[];
  generated_png_images?: string[];
};

type FourLayerSketchResult = {
  id?: number;
  generated_images: string[];
};

function resolveFourLayerSketchResponse(data: FourLayerSketchApiResponse): FourLayerSketchResult {
  const generatedImages = Array.isArray(data.generated_images) && data.generated_images.length > 0
    ? data.generated_images
    : data.generated_png_images;

  return {
    id: data.id,
    generated_images: Array.isArray(generatedImages) ? generatedImages : [],
  };
}

export async function generateFourLayerSketch(imageUrl: string): Promise<FourLayerSketchResult> {
  const endpoint = '/users/four-layer-sketch';
  const requestBody = {
    image_url: imageUrl,
  };

  console.log('[four-layer-sketch] request:start', {
    requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
    method: 'POST',
    body: requestBody,
  });

  try {
    const response = await apiClient.post<FourLayerSketchApiResponse>(
      endpoint,
      requestBody,
      { timeout: 0 },
    );

    const data = response.data;
    const parsed = resolveFourLayerSketchResponse(data);

    console.log('[four-layer-sketch] request:response', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      status: response.status,
      responseData: data,
      parsedResponse: parsed,
    });

    if (!Array.isArray(parsed.generated_images) || parsed.generated_images.length === 0) {
      throw new Error('Four layer sketch response did not include generated_images.');
    }

    console.log('[four-layer-sketch] request:success', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      id: parsed.id,
      generatedImagesCount: parsed.generated_images.length,
    });

    return parsed;
  } catch (error) {
    const axiosError = isAxiosError(error) ? error : null;
    const apiMessage = typeof axiosError?.response?.data === 'string'
      ? axiosError.response.data
      : undefined;

    console.error('[four-layer-sketch] request:error', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      message: axiosError?.message || (error instanceof Error ? error.message : 'Unknown error'),
      status: axiosError?.response?.status,
      responseData: axiosError?.response?.data,
      error,
    });

    throw new Error(
      apiMessage
      || axiosError?.message
      || (error instanceof Error ? error.message : 'Unable to generate drawing steps.'),
    );
  }
}
