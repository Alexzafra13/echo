export interface UploadRadioFaviconInput {
  stationUuid: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname: string;
  };
  uploadedBy?: string;
}

export interface UploadRadioFaviconOutput {
  success: boolean;
  message: string;
  imageId: string;
  url: string;
}
