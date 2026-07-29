import { useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';
import { genderText, resolveGender, type Gender } from './genderText';

/** עוזר לטקסט מערכת מותאם מין לפי המשתמש המחובר */
export function useGender() {
  const { user } = useAuth();
  const gender: Gender = resolveGender(user?.demographics);

  return useCallback(
    (femaleText: string, maleText: string) => genderText(gender, femaleText, maleText),
    [gender]
  );
}

export function useUserGender(): Gender {
  const { user } = useAuth();
  return resolveGender(user?.demographics);
}
