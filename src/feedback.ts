const FEEDBACK_EMAIL = "shyamrandar12@gmail.com";

export function feedbackUrl(version: string): string {
  const subject = `Feedback: bookmarkit_${version}`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_EMAIL)}&su=${encodeURIComponent(subject)}`;
}
