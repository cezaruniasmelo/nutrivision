import React, { useState, useRef } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase'; // Import auth directly
import { uploadProfessionalPhoto } from '../services/storageService';

interface UserProfileModalProps {
  user: User; // We still accept user for initial display values
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; 
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(user.photoURL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    // Critical Fix: Use auth.currentUser instead of 'user' prop.
    // The 'user' prop from React state might have lost its class prototype (becoming a plain object)
    // causing "i.getIdToken is not a function" when passed to Firebase SDK methods.
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        alert("Sessão expirada. Faça login novamente.");
        return;
    }

    setIsLoading(true);
    try {
      let photoURL = currentUser.photoURL;

      if (photoFile) {
        // Use currentUser.uid explicitly
        photoURL = await uploadProfessionalPhoto(currentUser.uid, photoFile);
      }

      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: photoURL
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      // Detailed error for debugging permission issues
      if (error.code === 'storage/unauthorized') {
          alert("Permissão negada ao salvar foto. Verifique as regras de Storage.");
      } else {
          alert("Erro ao salvar alterações: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-slate-800 rounded-3xl border border-slate-700 w-full max-w-md p-8 shadow-2xl animate-fadeIn">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Perfil Profissional</h2>
        
        <div className="flex flex-col items-center mb-8">
          <div 
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-28 h-28 rounded-full border-4 border-brand-500 overflow-hidden shadow-[0_0_20px_rgba(161,234,147,0.3)] bg-slate-700 flex items-center justify-center">
              {previewURL ? (
                <img src={previewURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-brand-500">
                  {displayName ? displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />
          <p className="text-xs text-slate-500 mt-2">Clique para alterar foto</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Nome Completo</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-brand-500 outline-none"
              placeholder="Dr. Nome Sobrenome"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">E-mail (Login)</label>
            <input 
              type="text" 
              value={user.email || ''}
              disabled
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 py-3 bg-brand-500 hover:bg-brand-400 text-slate-900 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex justify-center items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;