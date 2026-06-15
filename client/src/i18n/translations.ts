export type Locale = 'en' | 'fr';

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
    thankYou: 'Merci !',
    thankYouSubtitle: 'Vos souvenirs nous ont été partagés.',
  },
};
