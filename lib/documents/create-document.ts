import { DocumentStorageType } from "@prisma/client";

export type DocumentData = {
  name: string;
  key: string;
  storageType: DocumentStorageType;
  contentType: string; // actual file mime type
  supportedFileType: string; // papermark types: "pdf", "sheet", "docs", "slides", "map", "zip"
  fileSize: number | undefined; // file size in bytes
  numPages?: number;
  enableExcelAdvancedMode?: boolean;
};

export const createDocument = async ({
  documentData,
  teamId,
  numPages,
  folderPathName,
  createLink = false,
  token,
}: {
  documentData: DocumentData;
  teamId: string;
  numPages?: number;
  folderPathName?: string;
  createLink?: boolean;
  token?: string;
}) => {
  // create a document in the database with the blob url
  const url = `/api/teams/${teamId}/documents`;
  console.log('🔍 createDocument URL:', url);
  console.log('🔍 NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
  console.log('🔍 teamId:', teamId);
  
  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: documentData.name,
        url: documentData.key,
        storageType: documentData.storageType,
        numPages: numPages,
        folderPathName: folderPathName,
        type: documentData.supportedFileType,
        contentType: documentData.contentType,
        createLink: createLink,
        fileSize: documentData.fileSize,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error);
  }

  return response;
};

export const createAgreementDocument = async ({
  documentData,
  teamId,
  numPages,
  folderPathName,
}: {
  documentData: DocumentData;
  teamId: string;
  numPages?: number;
  folderPathName?: string;
}) => {
  // create a document in the database with the blob url
  const response = await fetch(`/api/teams/${teamId}/documents/agreement`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: documentData.name,
      url: documentData.key,
      storageType: documentData.storageType,
      numPages: numPages,
      folderPathName: folderPathName,
      type: documentData.supportedFileType,
      contentType: documentData.contentType,
      fileSize: documentData.fileSize,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};

// create a new version in the database
export const createNewDocumentVersion = async ({
  documentData,
  documentId,
  teamId,
  numPages,
}: {
  documentData: DocumentData;
  documentId: string;
  teamId: string;
  numPages?: number;
}) => {
  const response = await fetch(
    `/api/teams/${teamId}/documents/${documentId}/versions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: documentData.key,
        storageType: documentData.storageType,
        numPages: numPages,
        type: documentData.supportedFileType,
        contentType: documentData.contentType,
        fileSize: documentData.fileSize,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};
