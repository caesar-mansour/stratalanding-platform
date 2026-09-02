import RoomView from './RoomView';
import { getRoomPayload } from '@/lib/outreach/room-data';

export const dynamic = 'force-dynamic';

export default async function OutreachRoomPage() {
  const initialData = await getRoomPayload();
  return <RoomView initialData={initialData} />;
}
