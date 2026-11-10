import { useEffect } from 'react';
import { doc, setDoc, onSnapshot, collection, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubSettings, Player, Match } from '../types';

export function useFirestoreSync(
  settings: ClubSettings,
  setSettings: React.Dispatch<React.SetStateAction<ClubSettings>>,
  players: Player[],
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
  matches: Match[],
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>
) {
  // 1. Initial Listeners for Settings, Players, and Matches from Firestore
  useEffect(() => {
    let unsubscribed = false;

    // Listen to Settings
    const settingsDocRef = doc(db, 'settings', 'club');
    const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ClubSettings;
        if (data && data.clubName) {
          setSettings(data);
        }
      } else {
        // If Firestore doc doesn't exist yet, bootstrap it with initial settings
        if (!unsubscribed && settings) {
          setDoc(settingsDocRef, settings).catch(console.error);
        }
      }
    }, (err) => console.error('Firestore settings listener error:', err));

    // Listen to Players Collection
    const playersColRef = collection(db, 'players');
    const unsubPlayers = onSnapshot(playersColRef, (snapshot) => {
      if (!snapshot.empty) {
        const remotePlayers: Player[] = [];
        snapshot.forEach(docSnap => {
          remotePlayers.push(docSnap.data() as Player);
        });
        if (remotePlayers.length > 0) {
          setPlayers(remotePlayers);
        }
      } else {
        // Seed initial players if Firestore is empty
        if (!unsubscribed && players.length > 0) {
          players.forEach(p => {
            setDoc(doc(db, 'players', p.id), p).catch(console.error);
          });
        }
      }
    }, (err) => console.error('Firestore players listener error:', err));

    // Listen to Matches Collection
    const matchesColRef = collection(db, 'matches');
    const unsubMatches = onSnapshot(matchesColRef, (snapshot) => {
      if (!snapshot.empty) {
        const remoteMatches: Match[] = [];
        snapshot.forEach(docSnap => {
          remoteMatches.push(docSnap.data() as Match);
        });
        if (remoteMatches.length > 0) {
          // Sort by matchNumber or date descending
          remoteMatches.sort((a, b) => b.matchNumber - a.matchNumber);
          setMatches(remoteMatches);
        }
      } else {
        // Seed initial matches if Firestore is empty
        if (!unsubscribed && matches.length > 0) {
          matches.forEach(m => {
            setDoc(doc(db, 'matches', m.id), m).catch(console.error);
          });
        }
      }
    }, (err) => console.error('Firestore matches listener error:', err));

    return () => {
      unsubscribed = true;
      unsubSettings();
      unsubPlayers();
      unsubMatches();
    };
  }, []);
}

// Helpers to push single document updates to Firestore Cloud
export async function saveClubSettingsToFirestore(settings: ClubSettings) {
  try {
    await setDoc(doc(db, 'settings', 'club'), settings);
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
  }
}

export async function savePlayerToFirestore(player: Player) {
  try {
    await setDoc(doc(db, 'players', player.id), player);
  } catch (err) {
    console.error('Error saving player to Firestore:', err);
  }
}

export async function deletePlayerFromFirestore(playerId: string) {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'players', playerId));
  } catch (err) {
    console.error('Error deleting player from Firestore:', err);
  }
}

export async function saveMatchToFirestore(match: Match) {
  try {
    await setDoc(doc(db, 'matches', match.id), match);
  } catch (err) {
    console.error('Error saving match to Firestore:', err);
  }
}

export async function deleteMatchFromFirestore(matchId: string) {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (err) {
    console.error('Error deleting match from Firestore:', err);
  }
}
