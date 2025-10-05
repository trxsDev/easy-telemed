# React + Vite
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- <div align="center">
	<h1>easy-telemed (Frontend)</h1>
	<p>Vite + React + Ant Design + Firebase (Auth / Firestore) + WebRTC Call Room</p>
 </div>

## 📦 Stack
 - React 19 + Vite
 - Ant Design (UI)
 - Firebase (Auth / Firestore signaling)
 - WebRTC (P2P media) – basic offer/answer flow in `TelemedRoom`
 - Socket.IO (backend integration separate in `backend/` folder)

## 🔧 Prerequisites
| Requirement | Version (recommended) |
|-------------|-----------------------|
| Node.js     | 18+ LTS               |
| npm / pnpm  | npm already fine      |
| Firebase project | created & Firestore enabled |

## 🗂 Directory Highlights
```
easy-telemed/
	src/
		container/TelemedRoom/      # WebRTC demo room (Firestore signaling)
		context/                    # Auth context
		firebase.js                 # Firebase init (auth + firestore)
```

## 🔐 Environment Variables
Create `.env.local` (not committed) inside `easy-telemed/`:

```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
```

Restart `npm run dev` after adding.

## 🗄 Firestore Setup
1. เข้า Firebase Console > Firestore Database > Create Database
2. ถ้าแค่ทดสอบ เลือก Test mode (สะดวก) แล้วค่อยปรับ Rules ภายหลัง
3. หรือถ้าเลือก Production ให้แก้ Rules เปิดเฉพาะ collection ที่ต้องใช้

### Dev Rules (เปิดเฉพาะที่จำเป็นระหว่างทดลอง)
```
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /calls/{callId} {
			allow read, write: if true;            // CHANGE after prototype
			match /offerCandidates/{id} { allow read, write: if true; }
			match /answerCandidates/{id} { allow read, write: if true; }
		}
	}
}
```
อย่าลืมปรับให้ใช้ Auth ก่อน deploy production.

## ▶️ Run Dev Server
```bash
npm install
npm run dev
```
เปิดอีกแท็บ/หน้าต่าง browser เพื่อทดสอบ call 2 ฝั่ง

## 📞 Using TelemedRoom (P2P Demo)
Path: component `TelemedRoom` (ensure it is routed/rendered)

Flow ฝั่ง A:
1. กด “Start Webcam” (อนุญาตกล้อง/ไมค์)
2. กด “Create Call (offer)” → ได้ Call ID (จะโชว์บนปุ่ม)
3. Copy Call ID ส่งให้ฝั่ง B
4. รอให้ฝั่ง B Answer → เมื่อเชื่อมต่อสำเร็จจะเห็น remote video

Flow ฝั่ง B:
1. เปิดหน้าเดียวกัน (อีกแท็บ/อุปกรณ์)
2. กด “Start Webcam”
3. ใส่ Call ID ในช่อง input
4. กด “Answer”
5. เห็น remote video (ฝั่ง A) เมื่อเชื่อมต่อ

Hangup:
- ปุ่ม Hangup จะหยุด tracks และ reset RTCPeerConnection (ไม่ลบเอกสาร Firestore ในเวอร์ชันนี้)

## 🔍 Troubleshooting
| อาการ | วิธีเช็ค |
|-------|-----------|
| Call ID ขึ้นแต่ฝั่ง B ตอบไม่ได้ | ดู Console มี error rules หรือไม่ |
| permission denied | Firestore Rules ยังปิด – ปรับตามตัวอย่างด้านบน |
| วิดีโอไม่ขึ้น | ตรวจสิทธิ์กล้อง / ใช้ HTTPS บน network / ดู console |
| ICE / remote ไม่ขึ้น | ตรวจว่า `ontrack` เรียกหรือไม่, ดู candidate ใน subcollections |

เพิ่ม log ชั่วคราว (ตัวอย่าง):
```js
console.log('Adding offer candidate', event.candidate);
```

## 🧹 Optional Cleanup / TTL (แนะนำภายหลัง)
- เพิ่ม field `createdAt` / `expiresAt` แล้วใช้ Firestore TTL ลบเอกสารเก่า
- ลบ subcollection เมื่อ hangup (ต้องเขียนโค้ดเพิ่ม)

## 🛡 Hardening (หลัง PoC)
- เปลี่ยน Rules ให้ใช้ Auth (`request.auth != null`)
- จำกัดเฉพาะผู้ใช้ที่เกี่ยวข้องกับ call (เก็บ uid ใน doc)
- ลบ offer/answer หลังเชื่อมต่อสำเร็จ

## 🧪 Future Improvements
- ใช้ Socket.IO signaling (มี backend อยู่แล้ว) แทน Firestore เพื่อลด latency
- เพิ่ม screen sharing
- แยก hook: `useWebRTCSignaling()`

## 📜 License
Internal educational prototype (define a license here if needed)

---
Happy building! 🚀
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# easy-telemed
