import React, { useState } from 'react';
import { resolveFileUrl } from '../lib/api/client';
import { getUserInitials } from '../lib/format';

export interface UserAvatarProps {
  avatar?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Renders a user's resolved avatar image when available and reachable,
 * falling back to custom fallback content or uppercase initials.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  firstname,
  lastname,
  alt,
  className = '',
  fallback,
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmedAvatar = avatar?.trim();
  const resolvedUrl = trimmedAvatar ? resolveFileUrl(trimmedAvatar) : null;
  const showImage = Boolean(resolvedUrl && failedSrc !== resolvedUrl);
  const label = alt || `${firstname || ''} ${lastname || ''}`.trim() || 'User avatar';
  const fallbackContent = fallback !== undefined ? fallback : getUserInitials(firstname, lastname);

  return (
    <div className={`overflow-hidden flex items-center justify-center ${className}`.trim()}>
      {showImage && resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={label}
          className="w-full h-full object-cover"
          onError={() => setFailedSrc(resolvedUrl)}
        />
      ) : (
        fallbackContent
      )}
    </div>
  );
};
