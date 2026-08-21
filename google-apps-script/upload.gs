// Deployed manually at script.google.com — NOT run by this repo's build.
// This file is a tracked copy so changes can be reviewed here, then pasted
// into the Apps Script editor and redeployed (Deploy → Manage deployments →
// Edit → New version → Deploy). The exec URL stays the same across versions.
//
// Exec URL is stored as VITE_UPLOAD_SCRIPT_URL in .env.local (and the
// VITE_UPLOAD_SCRIPT_URL GitHub Actions secret for production).
//
// Actions (data.action, default "upload"):
//   upload        { fileName, mimeType, base64, startFolderId?, stage? }
//   createFolder  { name, parentFolderId? }
//   createGoogleFile { kind: "doc"|"slides"|"sheets", name, parentFolderId? }
//   rename        { itemType: "file"|"folder", id, name }
//   move          { itemType: "file"|"folder", id, newParentId }
//   moveToStage   { fileId, stage: "review"|"done" }
//   trash         { itemType: "file"|"folder", id }   — moves to Drive trash, not permanent
//
// createGoogleFile needs DocumentApp / SlidesApp / SpreadsheetApp, which are
// new OAuth scopes: after pasting this version in, run it once from the editor
// (or just re-deploy) and accept the extra permissions, or the action fails
// with an authorization error.
//
// Stage folders: social media images live in two folders under the root, and
// the app never asks anyone to pick between them. A new post's image uploads
// with stage "review"; marking the post complete calls moveToStage with
// "done". Both folders are created on first use, so no ids to configure.

const FOLDER_ID = "1Mhedr5wUk_KXzPcmTwJymvAkxYObPNEB";
const STAGE_FOLDER_NAMES = { review: "Review", done: "Done" };

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'upload';

    if (action === 'createFolder') return handleCreateFolder(data);
    if (action === 'moveToStage') return handleMoveToStage(data);
    if (action === 'createGoogleFile') return handleCreateGoogleFile(data);
    if (action === 'rename') return handleRename(data);
    if (action === 'move') return handleMove(data);
    if (action === 'trash') return handleTrash(data);
    return handleUpload(data);
  } catch (error) {
    return response({ success: false, error: error.toString() });
  }
}

function handleUpload(data) {
  const { fileName, mimeType, base64, startFolderId, stage } = data;
  if (!fileName || !mimeType || !base64) {
    return response({ success: false, error: "Missing file data" });
  }
  // An explicit folder wins (that's the Files browser uploading into whatever
  // the user is looking at); otherwise a stage, if one was asked for; the
  // root only as a last resort.
  const folder = startFolderId
    ? DriveApp.getFolderById(startFolderId)
    : stage
      ? getStageFolder(stage)
      : DriveApp.getFolderById(FOLDER_ID);
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  return response({
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    url: file.getUrl(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
  });
}

function handleCreateFolder(data) {
  const parent = data.parentFolderId
    ? DriveApp.getFolderById(data.parentFolderId)
    : DriveApp.getFolderById(FOLDER_ID);
  const existing = parent.getFoldersByName(data.name);
  const folder = existing.hasNext() ? existing.next() : parent.createFolder(data.name);
  return response({ success: true, folderId: folder.getId(), name: folder.getName(), url: folder.getUrl() });
}

function handleCreateGoogleFile(data) {
  const name = data.name || 'Untitled';
  var id;
  if (data.kind === 'doc') id = DocumentApp.create(name).getId();
  else if (data.kind === 'slides') id = SlidesApp.create(name).getId();
  else if (data.kind === 'sheets') id = SpreadsheetApp.create(name).getId();
  else return response({ success: false, error: 'Unknown kind: ' + data.kind });

  // These APIs always create in the script owner's My Drive root, so the new
  // file has to be moved into the folder the user is actually looking at.
  const parent = data.parentFolderId
    ? DriveApp.getFolderById(data.parentFolderId)
    : DriveApp.getFolderById(FOLDER_ID);
  const file = DriveApp.getFileById(id);
  file.moveTo(parent);

  return response({
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    url: file.getUrl(),
    mimeType: file.getMimeType(),
    folderId: parent.getId(),
  });
}

function handleRename(data) {
  const item = getItem(data.itemType, data.id);
  item.setName(data.name);
  return response({ success: true, name: item.getName() });
}

function handleMove(data) {
  const item = getItem(data.itemType, data.id);
  const newParent = DriveApp.getFolderById(data.newParentId);
  item.moveTo(newParent);
  return response({ success: true });
}

function handleMoveToStage(data) {
  const folder = getStageFolder(data.stage);
  if (!folder) return response({ success: false, error: "Unknown stage: " + data.stage });
  const file = DriveApp.getFileById(data.fileId);
  file.moveTo(folder);
  // The file's id and url both survive a move, so the app only needs to know
  // which stage it now sits in.
  return response({
    success: true,
    fileId: file.getId(),
    url: file.getUrl(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    stage: data.stage,
  });
}

/** Get-or-create the Review/Done folder under the root. */
function getStageFolder(stage) {
  const name = STAGE_FOLDER_NAMES[stage];
  if (!name) return null;
  const root = DriveApp.getFolderById(FOLDER_ID);
  const existing = root.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : root.createFolder(name);
}

function handleTrash(data) {
  const item = getItem(data.itemType, data.id);
  item.setTrashed(true);
  return response({ success: true });
}

function getItem(itemType, id) {
  return itemType === 'folder' ? DriveApp.getFolderById(id) : DriveApp.getFileById(id);
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
