import React,{useState, useRef, useEffect} from "react";
import { Button ,Input, message} from "antd";
import { supabase } from "../../api/SupabaseClient";
import { useUserAuthSupabase } from "../../context/UserAuthContextSupabase";

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
const channelsRef = useRef([]); // Store active channels for cleanup
const { user } = useUserAuthSupabase();
  // WebRTC
  const servers = {
    iceServers: [
      {
        urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
      },
    ],
    iceCandidatePoolSize: 10,
  };

// Set up Supabase auth for RLS
useEffect(() => {
  if (user && user.uid) {
    // Set auth context for Supabase RLS
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user.accessToken) {
        // If using Firebase auth, you might need to create a custom token
        // For now, we'll use a simple approach
        console.log('User logged in:', user.uid);
      }
    });
  }
}, [user]);

// Cleanup on component unmount
useEffect(() => {
  return () => {
    // Clean up when component unmounts
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    if (pcRef.current) {
      pcRef.current.close();
    }
    
    // Cleanup all channels
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch(_) {}
    });
  };
}, []);

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
    
    // Create a new video call record in Supabase
    const { data: callData, error: callError } = await supabase
      .from('video_calls')
      .insert({
        call_status: 'waiting'
      })
      .select()
      .single();
    
    if (callError) throw callError;
    
    const callId = callData.id;
    setCallId(callId); 
    setCallInput(callId);
    
    // Handle ICE candidates
    pc.onicecandidate = async (ev) => {
      if (ev.candidate) {
        await supabase
          .from('ice_candidates')
          .insert({
            call_id: callId,
            candidate_type: 'offer',
            candidate: ev.candidate.toJSON()
          });
      }
    };
    
    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);
    
    // Update call with offer
    await supabase
      .from('video_calls')
      .update({ 
        offer: { type: offerDesc.type, sdp: offerDesc.sdp },
        call_status: 'ringing'
      })
      .eq('id', callId);
    
    // Listen for answer
    const callChannel = supabase
      .channel(`call-${callId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'video_calls', filter: `id=eq.${callId}` },
        (payload) => {
          const data = payload.new;
          if (data?.answer && !pc.currentRemoteDescription) {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        }
      )
      .subscribe();
    
    // Listen for answer candidates
    const answerCandidatesChannel = supabase
      .channel(`answer-candidates-${callId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ice_candidates', filter: `call_id=eq.${callId} and candidate_type=eq.answer` },
        (payload) => {
          const data = payload.new;
          if (data?.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      )
      .subscribe();
    
    // Store channels for cleanup
    channelsRef.current.push(callChannel, answerCandidatesChannel);
    
    message.success('สร้าง Call สำเร็จ');
  } catch(e){ 
    console.error(e); 
    message.error('สร้าง Call ล้มเหลว'); 
  }
  finally { 
    setCreating(false); 
  }
};

const answerCall = async () => {
  if (!webcamStarted) { message.warning('Start webcam ก่อน'); return; }
  if (!callInput.trim()) { message.warning('ใส่ Call ID'); return; }
  setAnswering(true);
  try {
    const pc = getPeer();
    const callId = callInput.trim();
    
    // Handle ICE candidates
    pc.onicecandidate = async (ev) => {
      if (ev.candidate) {
        await supabase
          .from('ice_candidates')
          .insert({
            call_id: callId,
            candidate_type: 'answer',
            candidate: ev.candidate.toJSON()
          });
      }
    };
    
    // Get the call data
    const { data: callData, error: callError } = await supabase
      .from('video_calls')
      .select('*')
      .eq('id', callId)
      .single();
    
    if (callError || !callData) { 
      message.error('ไม่พบ Call'); 
      return; 
    }
    
    if (!callData.offer) {
      message.error('Call ยังไม่มี offer');
      return;
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answerDesc = await pc.createAnswer();
    await pc.setLocalDescription(answerDesc);
    
    // Update call with answer
    await supabase
      .from('video_calls')
      .update({ 
        answer: { type: answerDesc.type, sdp: answerDesc.sdp },
        call_status: 'connected'
      })
      .eq('id', callId);
    
    // Listen for offer candidates
    const offerCandidatesChannel = supabase
      .channel(`offer-candidates-${callId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ice_candidates', filter: `call_id=eq.${callId} and candidate_type=eq.offer` },
        (payload) => {
          const data = payload.new;
          if (data?.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      )
      .subscribe();
    
    // Store channels for cleanup
    channelsRef.current.push(offerCandidatesChannel);
    
    message.success('Answer สำเร็จ');
  } catch(e){ 
    console.error(e); 
    message.error('Answer ล้มเหลว'); 
  }
  finally { 
    setAnswering(false); 
  }
};

const hangup = async () => {
  try { 
    // Stop all local media tracks (camera and microphone)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    // Stop all tracks from peer connection
    pcRef.current?.getSenders().forEach(s=>{ 
      try { 
        if (s.track) {
          s.track.stop();
        }
      } catch(_){} 
    }); 
    
    // Close peer connection
    pcRef.current?.close(); 
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Update call status in database
    if (callId) {
      await supabase
        .from('video_calls')
        .update({ 
          call_status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);
    }
    
    // Cleanup subscriptions
    channelsRef.current.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch(_) {}
    });
    channelsRef.current = [];
    
  } catch(error){
    console.error('Error during hangup:', error);
  }
  
  // Reset state
  pcRef.current = null; 
  localStreamRef.current = null; 
  remoteStreamRef.current = new MediaStream();
  setWebcamStarted(false); 
  setCallId(""); 
  setCallInput("");
  
  message.success('วางสายแล้ว กล้องและไมโครโฟนถูกปิด');
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
