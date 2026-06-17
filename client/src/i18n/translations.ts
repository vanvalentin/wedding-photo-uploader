export type Locale = 'en' | 'fr' | 'zh-HK';

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
  previousImage: string;
  nextImage: string;
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
  uploadSummaryOnePhoto: string;
  uploadSummaryPhotos: string;
  uploadSummaryOneVideo: string;
  uploadSummaryVideos: string;
  uploadSummaryAnd: string;
  yourUploadedMemories: string;
  loadMore: string;
  curatedGalleryTitle: string;
  curatedGallerySubtitle: string;
  curatedGalleryLoading: string;
  curatedGalleryEmpty: string;
  curatedSeeMore: string;
  backToUpload: string;
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
    previousImage: 'Previous image',
    nextImage: 'Next image',
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
    uploadSummaryOnePhoto: '1 photo',
    uploadSummaryPhotos: '{count} photos',
    uploadSummaryOneVideo: '1 video',
    uploadSummaryVideos: '{count} videos',
    uploadSummaryAnd: 'and',
    yourUploadedMemories: 'What you shared',
    loadMore: 'Load more',
    curatedGalleryTitle: 'Highlights',
    curatedGallerySubtitle: 'A few of our favourite moments so far',
    curatedGalleryLoading: 'Loading highlights…',
    curatedGalleryEmpty: 'No highlights yet.',
    curatedSeeMore: 'See more',
    backToUpload: 'Back to upload',
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
    previousImage: 'Image précédente',
    nextImage: 'Image suivante',
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
    uploadSummaryOnePhoto: '1 photo',
    uploadSummaryPhotos: '{count} photos',
    uploadSummaryOneVideo: '1 vidéo',
    uploadSummaryVideos: '{count} vidéos',
    uploadSummaryAnd: 'et',
    yourUploadedMemories: 'Ce que vous avez partagé',
    loadMore: 'Voir plus',
    curatedGalleryTitle: 'Temps forts',
    curatedGallerySubtitle: 'Quelques-uns de nos moments préférés',
    curatedGalleryLoading: 'Chargement des temps forts…',
    curatedGalleryEmpty: 'Aucun temps fort pour le moment.',
    curatedSeeMore: 'Voir plus',
    backToUpload: 'Retour au téléversement',
  },
  'zh-HK': {
    title: '分享您的回憶',
    subtitle: '上載您在我們特別日子拍下的珍貴相片和影片',
    guestNameLabel: '您的姓名（可選填）',
    guestNamePlaceholder: '例如：嘉欣 & 家俊',
    uploadZoneTitle: '點按以新增相片和影片',
    uploadZoneHint: '或將檔案拖放到這裡',
    uploadZoneFormats: 'JPEG、PNG、HEIC、MP4、MOV 等格式',
    selectFiles: '選擇檔案',
    queueTitle: '您的上載項目',
    queueEmpty: '尚未選擇檔案',
    remove: '移除',
    uploadAll: '送出回憶',
    uploading: '正在上載…',
    uploadComplete: '已上載',
    uploadFailed: '上載失敗',
    retry: '重試',
    close: '關閉',
    previousImage: '上一張',
    nextImage: '下一張',
    beforeUnload: '您有正在上載或尚未送出的檔案。確定要離開嗎？',
    fileTooLarge: '檔案太大（上限 5 GB）',
    invalidFileType: '只支援相片和影片',
    noFilesSelected: '請至少新增一張相片或一段影片',
    progress: '進度',
    done: '完成',
    error: '錯誤',
    waiting: '等待中',
    addMore: '新增更多',
    uploadMore: '上載更多',
    thankYou: '多謝您！',
    thankYouSubtitle: '您的回憶已與我們分享。',
    uploadSummaryOnePhoto: '1 張相片',
    uploadSummaryPhotos: '{count} 張相片',
    uploadSummaryOneVideo: '1 段影片',
    uploadSummaryVideos: '{count} 段影片',
    uploadSummaryAnd: '及',
    yourUploadedMemories: '您分享的內容',
    loadMore: '載入更多',
    curatedGalleryTitle: '精選回憶',
    curatedGallerySubtitle: '我們至目前為止最喜愛的一些時刻',
    curatedGalleryLoading: '正在載入精選回憶…',
    curatedGalleryEmpty: '暫時未有精選回憶。',
    curatedSeeMore: '查看更多',
    backToUpload: '返回上載',
  },
};
