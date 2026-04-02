import { isAxiosError } from 'axios';

import { apiClient } from './image-to-svg';

type ImageToDrawRequest = {
  image_url: string;
  style: string;
  aspect_ratio: string;
};

type ImageToDrawApiResponse = {
  id?: number;
  image_url?: string;
  svg_url?: string;
  png_url?: string;
  generated_image?: string;
  generated_images?: string[];
  output?: string;
  url?: string;
};

function resolveImageToDrawResponse(data: ImageToDrawApiResponse | string): {
  id?: number;
  image_url?: string;
  svg_url?: string;
  png_url?: string;
} {
  if (typeof data === 'string') {
    const trimmed = data.trim();

    if (trimmed.endsWith('.svg')) {
      return { svg_url: trimmed };
    }

    return { image_url: trimmed };
  }

  const imageUrl = data.image_url
    || data.generated_image
    || data.generated_images?.[0]
    || data.output
    || data.url;

  return {
    id: data.id,
    image_url: imageUrl,
    svg_url: data.svg_url,
    png_url: data.png_url,
  };
}

export async function generateImageToDraw(
  requestBody: ImageToDrawRequest,
): Promise<{ id?: number; image_url?: string; svg_url?: string; png_url?: string }> {
  const endpoint = '/users/image-to-draw';

  console.log('[image-to-draw] request:start', {
    requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
    method: 'POST',
    body: requestBody,
  });

  try {
    const response = await apiClient.post<ImageToDrawApiResponse | string>(endpoint, requestBody);
    const parsed = resolveImageToDrawResponse(response.data);

    console.log('[image-to-draw] request:response', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      status: response.status,
      responseData: response.data,
      parsedResponse: parsed,
    });

    if (!parsed.svg_url && !parsed.image_url) {
      throw new Error('Image to draw response did not include an image or SVG URL.');
    }

    console.log('[image-to-draw] request:success', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      id: parsed.id,
      imageUrl: parsed.image_url,
      svgUrl: parsed.svg_url,
    });

    return parsed;
  } catch (error) {
    const axiosError = isAxiosError(error) ? error : null;
    const apiMessage = typeof axiosError?.response?.data === 'string'
      ? axiosError.response.data
      : undefined;

    console.error('[image-to-draw] request:error', {
      requestUrl: `${apiClient.defaults.baseURL}${endpoint}`,
      message: axiosError?.message || (error instanceof Error ? error.message : 'Unknown error'),
      status: axiosError?.response?.status,
      responseData: axiosError?.response?.data,
      error,
    });

    throw new Error(
      apiMessage
      || axiosError?.message
      || (error instanceof Error ? error.message : 'Unable to generate drawing from image.'),
    );
  }
}
