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
//   list          { folderId? }   — direct children only (root when omitted); lets the
//                                    app import content that already exists in Drive but
//                                    wasn't uploaded through it, since nothing here is
//                                    otherwise reflected in the app's own database
//
// createGoogleFile needs the Drive advanced service switched on once, in the
// editor: Services → + → Drive API → v3 → Add. It asks for no scope beyond the
// one DriveApp already uses, so no re-authorization is involved — but without
// it the action returns an error saying exactly this. (An earlier version used
// DocumentApp/SlidesApp/SpreadsheetApp instead, which did need three extra
// scopes and silently kept failing until someone re-authorized; don't go back
// to those without reading the note in handleCreateGoogleFile.)
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
    if (action === 'list') return handleList(data);
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

const GOOGLE_FILE_MIME = {
  doc: "application/vnd.google-apps.document",
  slides: "application/vnd.google-apps.presentation",
  sheets: "application/vnd.google-apps.spreadsheet",
};

function handleCreateGoogleFile(data) {
  const mimeType = GOOGLE_FILE_MIME[data.kind];
  if (!mimeType) return response({ success: false, error: 'Unknown kind: ' + data.kind });

  // Deliberately the advanced Drive service and not DocumentApp/SlidesApp/
  // SpreadsheetApp: those need three extra OAuth scopes, and Apps Script
  // decides the scope set by scanning this source, so merely mentioning them
  // would demand a re-authorization nobody remembers to do. Drive covers all
  // three kinds under the scope DriveApp already uses, and creates the file
  // in the right folder directly instead of in My Drive root then moving it.
  if (typeof Drive === 'undefined' || !Drive.Files) {
    return response({
      success: false,
      error: 'The Drive advanced service is not enabled — in the Apps Script editor, ' +
        'Services → + → Drive API → v3 → Add, then redeploy a new version.',
    });
  }

  const parentId = data.parentFolderId || FOLDER_ID;
  const name = data.name || 'Untitled';
  // v3 (`create`) is what the editor adds today; `insert` is the v2 spelling,
  // kept so an older enabled version of the service still works.
  const created = Drive.Files.create
    ? Drive.Files.create({ name: name, mimeType: mimeType, parents: [parentId] })
    : Drive.Files.insert({ title: name, mimeType: mimeType, parents: [{ id: parentId }] });

  // Read it back through DriveApp so the url/name/mimeType in the response are
  // exactly what every other action here reports.
  const file = DriveApp.getFileById(created.id);
  return response({
    success: true,
    fileId: file.getId(),
    fileName: file.getName(),
    url: file.getUrl(),
    mimeType: file.getMimeType(),
    folderId: parentId,
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

/** Direct children only — the app walks one level at a time, matching how the
 *  Files browser already navigates, rather than recursively scanning the
 *  whole tree in one call (which risks the ~6-minute Apps Script time limit
 *  on a large Drive). */
function handleList(data) {
  const folder = data.folderId ? DriveApp.getFolderById(data.folderId) : DriveApp.getFolderById(FOLDER_ID);

  const folders = [];
  const folderIter = folder.getFolders();
  while (folderIter.hasNext()) {
    const f = folderIter.next();
    folders.push({ id: f.getId(), name: f.getName(), url: f.getUrl() });
  }

  const files = [];
  const fileIter = folder.getFiles();
  while (fileIter.hasNext()) {
    const f = fileIter.next();
    files.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      url: f.getUrl(),
      modifiedTime: f.getLastUpdated().toISOString(),
    });
  }

  return response({ success: true, folderId: folder.getId(), folders: folders, files: files });
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
