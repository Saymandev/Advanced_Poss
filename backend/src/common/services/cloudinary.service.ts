import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  /**
   * Upload image to Cloudinary
   * @param file - File buffer or base64 string
   * @param folder - Folder path in Cloudinary (e.g., 'menu-items', 'company-logos')
   * @param publicId - Optional public ID for the image
   * @returns Promise with upload result containing secure_url
   */
  async uploadImage(
    file: Buffer | string,
    folder: string = 'restaurant-pos',
    publicId?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'image',
        overwrite: true,
        invalidate: true, // Invalidate CDN cache
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      // If file is a base64 string, use upload method
      if (typeof file === 'string') {
        cloudinary.uploader.upload(
          file,
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload failed: No result returned'));
            }
          },
        );
      } else {
        // If file is a Buffer, use upload_stream
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload failed: No result returned'));
            }
          },
        );
        uploadStream.end(file);
      }
    });
  }

  /**
   * Upload multiple images to Cloudinary
   * @param files - Array of file buffers or base64 strings
   * @param folder - Folder path in Cloudinary
   * @returns Promise with array of upload results
   */
  async uploadMultipleImages(
    files: (Buffer | string)[],
    folder: string = 'restaurant-pos',
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadImage(file, folder, `image-${Date.now()}-${index}`),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - Public ID of the image to delete
   * @returns Promise with deletion result
   */
  async deleteImage(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Delete multiple images from Cloudinary
   * @param publicIds - Array of public IDs to delete
   * @returns Promise with deletion results
   */
  async deleteMultipleImages(publicIds: string[]): Promise<any> {
    return cloudinary.api.delete_resources(publicIds);
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  extractPublicId(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

