import React,{useState, useRef} from "react";
import { Button ,Input, message} from "antd";
import { db } from "../../firebase";
import { collection, doc, setDoc, addDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

function TelemedRoom() {

const [callInput,setCallInput] = useState("");
const [callId,setCallId] = useState("");
const [webcamStarted,setWebcamStarted] = useState(false);
const [answering,setAnswering] = useState(false);
const [creating,setCreating] = useState(false);
const localVideoRef = useRef(null);
const remoteVideoRef = useRef(null);
const pcRef = useRef(null);
const localStreamRef = useRef(null);
const remoteStreamRef = useRef(new MediaStream());
  // WebRTC
  const servers = {
    iceServers: [
      {
        urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
      },
    ],
    iceCandidatePoolSize: 10,
  };

const getPeer = () => {
  if (!pcRef.current) {
    pcRef.current = new RTCPeerConnection(servers);
    pcRef.current.ontrack = (e)=>{
      e.streams[0].getTracks().forEach(t=>remoteStreamRef.current.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
  }
  return pcRef.current;
};

const startWebcam = async () => {
  try {
    const pc = getPeer();
    const local = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    localStreamRef.current = local;
    local.getTracks().forEach(t=>pc.addTrack(t, local));
    if (localVideoRef.current) localVideoRef.current.srcObject = local;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    setWebcamStarted(true);
  } catch (e) { console.error(e); message.error('เปิดกล้องไม่สำเร็จ'); }
};

const createCall = async () => {
  if (!webcamStarted) { message.warning('Start webcam ก่อน'); return; }
  setCreating(true);
  try {
    const pc = getPeer();
    const callDocRef = doc(collection(db,'calls'));
    setCallId(callDocRef.id); setCallInput(callDocRef.id);
    const offerCandidatesCol = collection(callDocRef,'offerCandidates');
    const answerCandidatesCol = collection(callDocRef,'answerCandidates');
    pc.onicecandidate = async (ev)=>{ if(ev.candidate) await addDoc(offerCandidatesCol, ev.candidate.toJSON()); };
    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);
    await setDoc(callDocRef, { offer: { type: offerDesc.type, sdp: offerDesc.sdp } });
    onSnapshot(callDocRef, snap => {
      const data = snap.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });
    onSnapshot(answerCandidatesCol, snap => {
      snap.docChanges().forEach(c => { if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); });
    });
    message.success('สร้าง Call สำเร็จ');
  } catch(e){ console.error(e); message.error('สร้าง Call ล้มเหลว'); }
  finally { setCreating(false); }
};

const answerCall = async () => {
  if (!webcamStarted) { message.warning('Start webcam ก่อน'); return; }
  if (!callInput.trim()) { message.warning('ใส่ Call ID'); return; }
  setAnswering(true);
  try {
    const pc = getPeer();
    const callDocRef = doc(collection(db,'calls'), callInput.trim());
    const answerCandidatesCol = collection(callDocRef,'answerCandidates');
    const offerCandidatesCol = collection(callDocRef,'offerCandidates');
    pc.onicecandidate = async (ev)=>{ if(ev.candidate) await addDoc(answerCandidatesCol, ev.candidate.toJSON()); };
    const snap = await getDoc(callDocRef);
    if (!snap.exists()) { message.error('ไม่พบ Call'); return; }
    const data = snap.data();
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answerDesc = await pc.createAnswer();
    await pc.setLocalDescription(answerDesc);
    await updateDoc(callDocRef, { answer: { type: answerDesc.type, sdp: answerDesc.sdp } });
    onSnapshot(offerCandidatesCol, s => {
      s.docChanges().forEach(c=>{ if(c.type==='added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); });
    });
    message.success('Answer สำเร็จ');
  } catch(e){ console.error(e); message.error('Answer ล้มเหลว'); }
  finally { setAnswering(false); }
};

const hangup = () => {
  try { pcRef.current?.getSenders().forEach(s=>{ try { s.track.stop(); } catch(_){} }); pcRef.current?.close(); } catch(_){}
  pcRef.current=null; localStreamRef.current=null; remoteStreamRef.current=new MediaStream();
  setWebcamStarted(false); setCallId(""); setCallInput("");
};

  return (
    <div>
      <h1>Telemed Room</h1>
      <h2>1. Start your Webcam</h2>
      <div className="videos">
        <span>
          <h3>Local Stream</h3>
          <video ref={localVideoRef} id="webcamVideo" autoPlay playsInline muted></video>
        </span>
        <span>
          <h3>Remote Stream</h3>
          <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline></video>
        </span>
      </div>

      <Button onClick={startWebcam} disabled={webcamStarted}>Start webcam</Button>
      <h2>2. Create a new Call</h2>
      <Button onClick={createCall} disabled={!webcamStarted || !!callId} loading={creating}>
        {callId ? `Call ID: ${callId}` : 'Create Call (offer)'}
      </Button>

      <h2>3. Join a Call</h2>
      <p>Answer the call from a different browser window or device</p>

      <Input value={callInput} onChange={(e) => setCallInput(e.target.value)} placeholder="Enter Call ID" style={{maxWidth:260}} />
      <Button onClick={answerCall} disabled={!webcamStarted || !callInput} loading={answering}>
        Answer
      </Button>

      <h2>4. Hangup</h2>

      <Button id="hangupButton" danger disabled={!webcamStarted} onClick={hangup}>Hangup</Button>
    </div>
  );
}

export default TelemedRoom;
