import { getTranslations } from 'next-intl/server';
import RegisterClient from "./RegisterClient";

export async function generateMetadata() {
  const t = await getTranslations('metadata.register');
  return { title: t('title') };
}

export default function RegisterPage() {
  return <RegisterClient />;
}