export type Locale = 'en' | 'fr' | 'zh-HK';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
  'zh-HK': '繁',
};

export interface Translations {
  title: string;
  subtitle: string;
  guestNameLabel: string;
  guestNamePlaceholder: string;
  uploadZoneTitle: string;
  uploadZoneHint: string;
  uploadZoneFormats: string;
  selectFiles: string;
  queueTitle: string;
  queueEmpty: string;
  remove: string;
  uploadAll: string;
  uploading: string;
  uploadComplete: string;
  uploadFailed: string;
  retry: string;
  close: string;
  beforeUnload: string;
  fileTooLarge: string;
  invalidFileType: string;
  noFilesSelected: string;
  progress: string;
  done: string;
  error: string;
  waiting: string;
  addMore: string;
  uploadMore: string;
  thankYou: string;
  thankYouSubtitle: string;
}

export const translations: Record<Locale, Translations> = {
  en: {
    title: 'Share Your Memories',
    subtitle: 'Upload your favourite photos & videos from our special day',
    guestNameLabel: 'Your name (optional)',
    guestNamePlaceholder: 'e.g. Marie & Thomas',
    uploadZoneTitle: 'Tap to add photos & videos',
    uploadZoneHint: 'or drag and drop here',
    uploadZoneFormats: 'JPEG, PNG, HEIC, MP4, MOV & more',
    selectFiles: 'Choose files',
    queueTitle: 'Your uploads',
    queueEmpty: 'No files selected yet',
    remove: 'Remove',
    uploadAll: 'Send memories',
    uploading: 'Uploading…',
    uploadComplete: 'Uploaded',
    uploadFailed: 'Upload failed',
    retry: 'Retry',
    close: 'Close',
    beforeUnload: 'You have uploads in progress or unsent files. Are you sure you want to leave?',
    fileTooLarge: 'File is too large (max 5 GB)',
    invalidFileType: 'Only photos and videos are supported',
    noFilesSelected: 'Please add at least one photo or video',
    progress: 'Progress',
    done: 'Done',
    error: 'Error',
    waiting: 'Waiting',
    addMore: 'Add more',
    uploadMore: 'Upload more',
    thankYou: 'Thank you!',
    thankYouSubtitle: 'Your memories have been shared with us.',
  },
  fr: {
    title: 'Partagez vos souvenirs',
    subtitle: 'Téléversez vos plus belles photos et vidéos de notre journée',
    guestNameLabel: 'Votre nom (facultatif)',
    guestNamePlaceholder: 'ex. Marie & Thomas',
    uploadZoneTitle: 'Appuyez pour ajouter photos et vidéos',
    uploadZoneHint: 'ou glissez-déposez ici',
    uploadZoneFormats: 'JPEG, PNG, HEIC, MP4, MOV et plus',
    selectFiles: 'Choisir des fichiers',
    queueTitle: 'Vos fichiers',
    queueEmpty: 'Aucun fichier sélectionné',
    remove: 'Supprimer',
    uploadAll: 'Envoyer les souvenirs',
    uploading: 'Téléversement…',
    uploadComplete: 'Téléversé',
    uploadFailed: 'Échec du téléversement',
    retry: 'Réessayer',
    close: 'Fermer',
    beforeUnload:
      'Des téléversements sont en cours ou des fichiers ne sont pas encore envoyés. Voulez-vous vraiment quitter ?',
    fileTooLarge: 'Fichier trop volumineux (max 5 Go)',
    invalidFileType: 'Seules les photos et vidéos sont acceptées',
    noFilesSelected: 'Veuillez ajouter au moins une photo ou une vidéo',
    progress: 'Progression',
    done: 'Terminé',
    error: 'Erreur',
    waiting: 'En attente',
    addMore: 'Ajouter',
    uploadMore: 'Téléverser d\'autres fichiers',
    thankYou: 'Merci !',
    thankYouSubtitle: 'Vos souvenirs nous ont été partagés.',
  },
  'zh-HK': {
    title: '分享你的回憶',
    subtitle: '上載在我們大日子拍下的照片與影片',
    guestNameLabel: '你的名字（選填）',
    guestNamePlaceholder: '例如：小明與小美',
    uploadZoneTitle: '按此新增照片與影片',
    uploadZoneHint: '或拖放至此',
    uploadZoneFormats: 'JPEG、PNG、HEIC、MP4、MOV 等',
    selectFiles: '選擇檔案',
    queueTitle: '你的檔案',
    queueEmpty: '尚未選擇檔案',
    remove: '移除',
    uploadAll: '傳送回憶',
    uploading: '上載中…',
    uploadComplete: '已上載',
    uploadFailed: '上載失敗',
    retry: '重試',
    close: '關閉',
    beforeUnload: '仍有檔案未傳送或正在上載。確定要離開嗎？',
    fileTooLarge: '檔案過大（最大 5 GB）',
    invalidFileType: '只支援照片與影片',
    noFilesSelected: '請至少新增一張照片或一段影片',
    progress: '進度',
    done: '完成',
    error: '錯誤',
    waiting: '等候中',
    addMore: '新增更多',
    uploadMore: '繼續上載',
    thankYou: '謝謝你！',
    thankYouSubtitle: '你的回憶已經與我們分享了。',
  },
};
