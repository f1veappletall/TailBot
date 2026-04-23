import { CameraIcon, MapPinIcon, MicIcon, XIcon } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { fetchGroq } from "../../lib/api";

const chatMessages: ChatMessage[] = [
  {
    id: 1,
    sender: "bot",
    message: "Hello! I'm TailBot, your animal medical assistant. I can help with pet emergencies and provide guidance for injured animals. Please describe your concern, and I'll do my best to help. 🐾",
    time: "10:00 AM",
  }
];

const vetLocations = [
  {
    id: 1,
    name: "Pawsome Pet Clinic",
    distance: "0.8 km",
    address: "123 Connaught Place, New Delhi",
    rating: 4.8,
    reviews: 256,
    coords: { lat: 28.6329, lng: 77.2196 }
  },
  {
    id: 2,
    name: "Happy Tails Veterinary Hospital",
    distance: "1.2 km",
    address: "456 Hauz Khas, New Delhi",
    rating: 4.6,
    reviews: 189,
    coords: { lat: 28.5494, lng: 77.2001 }
  },
  {
    id: 3,
    name: "Caring Paws Pet Hospital",
    distance: "2.1 km",
    address: "789 Greater Kailash, New Delhi",
    rating: 4.9,
    reviews: 312,
    coords: { lat: 28.5489, lng: 77.2421 }
  },
];

interface ChatMessage {
  id: number;
  sender: "user" | "bot";
  message: string;
  time: string;
}

export const ChatbotInterface = (): JSX.Element => {
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [showMicDialog, setShowMicDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi">("en");
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAllowLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setShowLocationDialog(false);
          setShowLocationResults(true);
          setLocationError("");
        },
        (error) => {
          console.error("Error getting location:", error);
          const defaultLocation = { lat: 28.6329, lng: 77.2196 };
          setUserLocation(defaultLocation);
          setShowLocationDialog(false);
          setShowLocationResults(true);
          setLocationError("");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }
  };

  const startListening = (language: "en" | "hi") => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window as any).webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === "hi" ? 'hi-IN' : 'en-IN';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          setInputValue(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
    } else {
      console.error('Speech recognition not supported');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setShowLanguageDialog(false);
    }
  };

  const handleMicClick = () => {
    setShowMicDialog(true);
  };

  const handleMicPermissionGranted = () => {
    setShowMicDialog(false);
    setShowLanguageDialog(true);
  };

  const handleLanguageSelect = (language: "en" | "hi") => {
    setSelectedLanguage(language);
    setShowLanguageDialog(false);
    startListening(language);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLocationsWithDistances = () => {
    if (!userLocation) return vetLocations;

    return vetLocations.map(location => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        location.coords.lat,
        location.coords.lng
      );
      return {
        ...location,
        distance: `${distance.toFixed(1)} km`
      };
    }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  };

  const sortedVetLocations = getLocationsWithDistances();

  const handleViewOnGoogleMaps = () => {
    window.open('https://www.google.com/maps/search/veterinary+clinic+near+me', '_blank');
  };

  const handleCloseResults = () => {
    setShowLocationResults(false);
    setUserLocation(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleSendMessage = async (messageText?: string) => {
    const message = messageText || inputValue.trim();
    if (!message || isLoading) return;
  
    setIsLoading(true);
    const newMessage: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      message: message,
      time: getCurrentTime()
    };
  
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  
    try {
      // ✨ call Groq now
      const botReply = await fetchGroq(message);
  
      const botResponse: ChatMessage = {
        id: messages.length + 2,
        sender: "bot",
        message: botReply,
        time: getCurrentTime()
      };
  
      setMessages(prev => [...prev, botResponse]);
  
      if (botReply && botReply.toLowerCase().includes('vet')) {
        setTimeout(() => setShowLocationDialog(true), 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        sender: "bot",
        message: "I apologize, but I'm having technical difficulties. Please try again later 🐾",
        time: getCurrentTime()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };  

  const handleSendImage = async () => {
    if (!selectedImage) return;
  
    const userPhotoMessage: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      message: `<img src="${URL.createObjectURL(selectedImage)}" alt="Pet photo" class="max-w-[200px] rounded-lg" />`,
      time: getCurrentTime()
    };
    setMessages(prev => [...prev, userPhotoMessage]);
    setShowCameraDialog(false);
  
    try {
    const response = await fetch("/.netlify/functions/predict-animal", {
  method: "POST",
  headers: {
    "Content-Type": selectedImage.type || "application/octet-stream"
  },
  body: selectedImage
});
  
      const result = await response.json();
      console.log("🐾 Huggingface Result:", result);
  
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("No valid prediction");
      }
  
      const label = result?.[0]?.label?.split(",")[0] || "something";
  
      const botMessage: ChatMessage = {
        id: messages.length + 2,
        sender: "bot",
        message: `I see it's a ${label.toLowerCase()}, is the furry okay? 🐾`,
        time: getCurrentTime()
      };
  
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        sender: "bot",
        message: "I'm sorry, I couldn't recognize the image. Please try again 🐾",
        time: getCurrentTime()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSelectedImage(null);
    }
  };
  
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="bg-transparent flex flex-row justify-center w-full">
      <Card className="w-full max-w-[830px] h-[591px] relative border border-solid shadow-[0px_4px_4px_#00000040] bg-black overflow-hidden p-0">
        <header className="relative h-[108px] border-b border-white">
          <div className="absolute w-48 h-[78px] top-1.5 left-7">
            <div className="absolute w-[152px] h-[37px] top-10 left-0">
              <img
                className="absolute w-4 h-[34px] top-1 left-[136px]"
                alt="Vector"
                src="/vector.png"
              />
              <img
                className="absolute w-[23px] h-[26px] top-[11px] left-[108px]"
                alt="Vector"
                src="/vector-1.png"
              />
              <img
                className="absolute w-[23px] h-[35px] top-0.5 left-[79px]"
                alt="Vector"
                src="/vector-2.png"
              />
              <img
                className="absolute w-[7px] h-[35px] top-0.5 left-[67px]"
                alt="Vector"
                src="/vector-3.png"
              />
              <img
                className="absolute w-[7px] h-[37px] top-0 left-[55px]"
                alt="Vector"
                src="/vector-4.png"
              />
              <img
                className="absolute w-[23px] h-[26px] top-[11px] left-[26px]"
                alt="Vector"
                src="/vector-5.png"
              />
              <img
                className="absolute w-[21px] h-[35px] top-0.5 left-0"
                alt="Vector"
                src="/vector-6.png"
              />
            </div>

            <div className="absolute w-[153px] h-[38px] top-[39px] left-0">
              <img
                className="absolute w-[17px] h-[35px] top-1 left-[136px]"
                alt="Stroke"
                src="/stroke.png"
              />
              <img
                className="absolute w-6 h-[27px] top-[11px] left-[108px]"
                alt="Stroke"
                src="/stroke-1.png"
              />
              <img
                className="absolute w-2 h-9 top-0.5 left-[67px]"
                alt="Stroke"
                src="/stroke-2.png"
              />
              <img
                className="absolute w-2 h-[38px] top-0 left-[55px]"
                alt="Stroke"
                src="/stroke-3.png"
              />
              <img
                className="absolute w-6 h-[27px] top-[11px] left-[26px]"
                alt="Stroke"
                src="/stroke-4.png"
              />
              <img
                className="absolute w-[22px] h-9 top-0.5 left-0"
                alt="Stroke"
                src="/stroke-5.png"
              />
            </div>

            <img
              className="absolute w-[140px] h-16 top-0 left-[52px] object-cover"
              alt="Tailbot logo"
              src="/tailbot-logo-1.png"
            />
          </div>
        </header>

        <div className="p-6 h-[364px] overflow-y-auto">
          {!showLocationResults ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-4`}
              >
                <div
                  className={`p-2 rounded-lg max-w-[362px] ${
                    message.sender === "user"
                      ? "bg-[#f6cbcb] rounded-[10px_10px_0px_10px]"
                      : "bg-[#b2b2b2] rounded-[10px_10px_10px_0px]"
                  }`}
                >
                  <p className="font-normal text-black text-[17px] leading-normal font-['Roboto',Helvetica]"
                     dangerouslySetInnerHTML={{ __html: message.message }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="bg-[#b2b2b2] p-3 rounded-[10px_10px_10px_0px] max-w-[362px]">
                  <p className="font-normal text-black text-[17px] leading-normal font-['Roboto',Helvetica]">
                    Here are the nearest veterinary clinics in your area:
                  </p>
                </div>
                <button
                  onClick={handleCloseResults}
                  className="p-2 hover:bg-[#FFB6C1]/10 rounded-full transition-colors"
                >
                  <XIcon className="w-5 h-5 text-[#FFB6C1]" />
                </button>
              </div>
              {sortedVetLocations.map((location) => (
                <div
                  key={location.id}
                  className="bg-[#1C1C1C] p-4 rounded-lg cursor-pointer hover:bg-[#2C2C2C] transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-white text-lg font-semibold">{location.name}</h3>
                    <span className="text-[#FFB6C1] text-sm">{location.distance}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{location.address}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white">{location.rating}</span>
                    <span className="text-gray-400">({location.reviews} reviews)</span>
                  </div>
                </div>
              ))}
              <button
                onClick={handleViewOnGoogleMaps}
                className="w-full bg-[#FFB6C1] text-black py-2 rounded-lg hover:bg-[#FFB6C1]/90 transition-colors"
              >
                View on Google Maps
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="absolute bottom-0 w-full p-4 flex items-center gap-3">
          <div className="flex space-x-2 md:space-x-4">
            <button 
              className="p-1 hover:opacity-80 transition-opacity"
              onClick={() => setShowLocationDialog(true)}
            >
              <MapPinIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#FFB6C1]" />
            </button>
            <button 
              className="p-1 hover:opacity-80 transition-opacity relative"
              onClick={isListening ? stopListening : handleMicClick}
            >
              <MicIcon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${isListening ? 'text-red-500' : 'text-[#FFB6C1]'}`} />
              {isListening && (
                <button
                  onClick={stopListening}
                  className="absolute -top-2 -right-2 p-1 bg-black rounded-full hover:bg-gray-900 transition-colors"
                >
                  <XIcon className="w-4 h-4 text-red-500" />
                </button>
              )}
            </button>
            <button 
              className="p-1 hover:opacity-80 transition-opacity"
              onClick={() => setShowCameraDialog(true)}
            >
              <CameraIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#FFB6C1]" />
            </button>
          </div>

          <div className="relative flex-1">
            <Input
              className="w-full h-[73px] bg-black text-[#b2b2b2] border-2 border-white rounded-lg pl-4 pr-16 py-3 text-base font-['Noto_Color_Emoji',Helvetica]"
              placeholder="Describe your pet's condition..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80 transition-opacity"
              onClick={() => handleSendMessage()}
              disabled={isLoading}
            >
              <img
                className="w-[40px] h-8 sm:w-[48px] sm:h-9 md:w-[58px] md:h-11 object-cover"
                alt="Cat footprint"
                src="/cat-footprint.png"
              />
            </button>
          </div>
        </div>

        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent className="bg-black border-0 text-white p-8 max-w-md mx-auto">
            <DialogTitle className="text-[#FFB6C1] text-3xl font-semibold text-center mb-12">
              Allow TailBot to access your location?
            </DialogTitle>
            <div className="flex justify-center gap-8">
              <button
                onClick={handleAllowLocation}
                className="flex items-center gap-2 px-8 py-3 bg-transparent border-2 border-[#00FF00] rounded-lg text-[#00FF00] text-xl hover:bg-[#00FF00]/10 transition-colors"
              >
                Allow ✓
              </button>
              <button
                onClick={() => setShowLocationDialog(false)}
                className="flex items-center gap-2 px-8 py-3 bg-transparent border-2 border-[#FF0000] rounded-lg text-[#FF0000] text-xl hover:bg-[#FF0000]/10 transition-colors"
              >
                Deny ✗
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMicDialog} onOpenChange={setShowMicDialog}>
          <DialogContent className="bg-black border-0 text-white p-8 max-w-md mx-auto">
            <DialogTitle className="text-[#FFB6C1] text-3xl font-semibold text-center mb-12">
              Allow TailBot to use your microphone?
            </DialogTitle>
            <div className="flex justify-center gap-8">
              <button
                onClick={handleMicPermissionGranted}
                className="flex items-center gap-2 px-8 py-3 bg-transparent border-2 border-[#00FF00] rounded-lg text-[#00FF00] text-xl hover:bg-[#00FF00]/10 transition-colors"
              >
                Allow ✓
              </button>
              <button
                onClick={() => setShowMicDialog(false)}
                className="flex items-center gap-2 px-8 py-3 bg-transparent border-2 border-[#FF0000] rounded-lg text-[#FF0000] text-xl hover:bg-[#FF0000]/10 transition-colors"
              >
                Deny ✗
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
          <DialogContent className="bg-black border-0 text-white p-8 max-w-md mx-auto">
            <DialogTitle className="text-[#FFB6C1] text-3xl font-semibold text-center mb-12">
              Choose your language
            </DialogTitle>
            <div className="flex justify-center gap-8">
              <button
                onClick={() => handleLanguageSelect("en")}
                className="px-8 py-3 bg-transparent border-2 border-white rounded-lg text-white text-xl hover:bg-white/10 transition-colors"
              >
                English
              </button>
              <button
                onClick={() => handleLanguageSelect("hi")}
                className="px-8 py-3 bg-transparent border-2 border-white rounded-lg text-white text-xl hover:bg-white/10 transition-colors"
              >
                हिंदी
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
          <DialogContent className="bg-black border-0 text-white p-8 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-8">
              <DialogTitle className="text-[#FFB6C1] text-3xl font-semibold">
                Upload a photo
              </DialogTitle>
              <button
                onClick={() => setShowCameraDialog(false)}
                className="p-2 hover:bg-[#FFB6C1]/10 rounded-full transition-colors"
              >
                <XIcon className="w-6 h-6 text-[#FFB6C1]" />
              </button>
            </div>
            <div className="space-y-6">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="photo-upload"
              />
              {!selectedImage ? (
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-32 bg-transparent border-2 border-dashed border-[#FFB6C1] rounded-lg cursor-pointer hover:bg-[#FFB6C1]/10 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <CameraIcon className="w-12 h-12 text-[#FFB6C1] mb-2" />
                    <p className="text-sm text-[#FFB6C1]">Add a photo of your pet</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Selected"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <XIcon className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendImage}
                    className="w-full flex items-center justify-center gap-2 bg-[#FFB6C1] text-black py-3 rounded-lg hover:bg-[#FFB6C1]/90 transition-colors"
                  >
                    <span>Send Photo</span>
                    <img
                      src="/cat-footprint.png"
                      alt="Paw"
                      className="w-6 h-6 object-contain"
                    />
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};
