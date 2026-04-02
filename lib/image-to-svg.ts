import axios, { isAxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://3.145.90.196:8000';

const resolvedApiBaseUrl =
  process.env.EXPO_PUBLIC_IMAGE_TO_SVG_API_BASE_URL?.trim() ||
  String(Constants.expoConfig?.extra?.imageToSvgApiBaseUrl ?? '').trim() ||
  DEFAULT_API_BASE_URL;

const API_BASE_URL = resolvedApiBaseUrl.replace(/\/+$/, '');

const API_HEADERS = {
  'Content-Type': 'application/json',
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: API_HEADERS,
  timeout: 20000,
});

type ImageToSvgApiResponse = {
  svg_url?: string;
  png_url?: string;
};

function buildNetworkErrorMessage(requestUrl: string) {
  const usesCleartextHttp = requestUrl.startsWith('http://');
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  if (usesCleartextHttp && isExpoGo) {
    return `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Expo Go blocks cleartext HTTP requests. Use a development build, or change the API base URL to HTTPS.`;
  }

  if (Platform.OS === 'android' && usesCleartextHttp) {
    return 'Android could not reach the HTTP API. Rebuild the app so the latest AndroidManifest cleartext settings are included, or change the API base URL to HTTPS.';
  }

  if (Platform.OS === 'ios' && usesCleartextHttp) {
    return 'iOS could not reach the HTTP API. Rebuild the app so the latest Info.plist transport security settings are included, or change the API base URL to HTTPS.';
  }

  return `Unable to reach ${requestUrl}. Confirm the server is reachable from the device and the API base URL is correct.`;
}

export async function convertImageToSvg(imageUrl: string): Promise<{ svg_url: string; png_url?: string }> {
  const endpoint = '/users/image-to-svg-converter';
  let lastErrorMessage = 'Unable to convert image to SVG.';

  const requestBody = {
    image_url: imageUrl,
  };

  console.log('[image-to-svg] request:start', {
    requestUrl: `${API_BASE_URL}${endpoint}`,
    method: 'POST',
    headers: API_HEADERS,
    body: requestBody,
  });

  try {
    const response = await apiClient.post<ImageToSvgApiResponse>(endpoint, requestBody);

    console.log('[image-to-svg] request:response', {
      requestUrl: `${API_BASE_URL}${endpoint}`,
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      responseData: response.data,
    });

    const data = response.data;

    if (!data.svg_url) {
      console.error('[image-to-svg] request:missing-svg-url', {
        requestUrl: `${API_BASE_URL}${endpoint}`,
        parsedResponse: data,
      });
      throw new Error('Image to SVG response did not include svg_url');
    }

    console.log('[image-to-svg] request:success', {
      requestUrl: `${API_BASE_URL}${endpoint}`,
      svgUrl: data.svg_url,
    });

    return { svg_url: data.svg_url, png_url: data.png_url };
  } catch (error) {
    const requestUrl = `${API_BASE_URL}${endpoint}`;
    const axiosError = isAxiosError(error) ? error : null;
    const status = axiosError?.response?.status;
    const responseData = axiosError?.response?.data;
    const errorMessage =
      axiosError?.message ||
      (error instanceof Error ? error.message : 'Unknown network error');

    lastErrorMessage = errorMessage || lastErrorMessage;

    console.error('[image-to-svg] request:error', {
      requestUrl,
      error,
      errorMessage,
      status,
      responseData,
    });

    if (status === 404 || status === 405) {
      console.warn('[image-to-svg] request:retrying-next-endpoint', {
        requestUrl,
        status,
      });
    }

    if (
      errorMessage === 'Network Error' ||
      errorMessage === 'Network request failed'
    ) {
      lastErrorMessage = buildNetworkErrorMessage(requestUrl);

      console.error('[image-to-svg] request:network-failed-hint', {
        requestUrl,
        apiBaseUrl: API_BASE_URL,
        note: lastErrorMessage,
        executionEnvironment: Constants.executionEnvironment,
        platform: Platform.OS,
      });
    }
  }

  throw new Error(lastErrorMessage);
}
