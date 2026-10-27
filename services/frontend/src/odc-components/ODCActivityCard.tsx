import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Activity } from '../types';
import { getPexelsPhotoForActivity } from '../utils/photoUtils';

export interface ODCActivityCardProps {
  activity: Activity;
  destination?: string;
  onOpenDetails: (activity: Activity) => void;
  onOpenMenu: (activity: Activity, event: React.MouseEvent) => void;
  onViewOnMap?: (activity: Activity) => void;
}

/**
 * Reusable OutSystems ODC ActivityCard Block
 * Renders individual activity timeline item with dot, photo, time, location, tags and options
 */
export const ODCActivityCard: React.FC<ODCActivityCardProps> = ({
  activity,
  destination = '',
  onOpenDetails,
  onOpenMenu,
  onViewOnMap,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [activity.id, activity.imageUrl, destination]);

  const fallbackPhoto = getPexelsPhotoForActivity(activity, destination);
  const displayImage = (!imgError && activity.imageUrl) ? activity.imageUrl : fallbackPhoto.url;

  const cleanPlace = activity.placeName?.trim() || '';
  const cleanSector = activity.addressOrSector?.trim() || '';
  const isPlaceDistinctFromTitle =
    Boolean(cleanPlace) &&
    cleanPlace.toLowerCase() !== activity.title.trim().toLowerCase();
  const isPlaceMentionedInTitle =
    Boolean(cleanPlace) &&
    activity.title.toLowerCase().includes(cleanPlace.toLowerCase());

  const locationLabel = cleanSector
    ? isPlaceDistinctFromTitle &&
      !isPlaceMentionedInTitle &&
      !cleanSector.toLowerCase().includes(cleanPlace.toLowerCase())
      ? `${cleanPlace} · ${cleanSector}`
      : cleanSector
    : isPlaceDistinctFromTitle
    ? cleanPlace
    : '';

  return (
    <div className="fw-activity" id={`activity-${activity.id}`}>
      <div className="fw-timeline__dot" />
      <div className="fw-activity__card">
        <div
          className="fw-activity__open"
          onClick={() => onOpenDetails(activity)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetails(activity);
            }
          }}
        >
          <div className="fw-activity__img fw-img-fallback overflow-hidden relative group">
            <img
              key={displayImage}
              src={displayImage}
              alt={activity.placeName || activity.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                if (!imgError && activity.imageUrl && activity.imageUrl !== fallbackPhoto.url) {
                  setImgError(true);
                } else if (e.currentTarget.src !== fallbackPhoto.url) {
                  e.currentTarget.src = fallbackPhoto.url;
                } else {
                  e.currentTarget.src =
                    'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
                }
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="fw-activity__body">
            <span className={`fw-time ${activity.isFood ? 'fw-time--food' : ''}`}>
              {activity.timeRange}
            </span>
            <div className="fw-activity__title">{activity.title}</div>
            {locationLabel && (
              <div className="flex items-center gap-1 text-xs font-medium text-[#556358] mb-1 min-w-0">
                <MapPin size={12} className="shrink-0 text-[#4A7C59]" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
            <div className="fw-activity__desc">{activity.description}</div>
          </div>
        </div>

        <div className="fw-activity__foot">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="fw-cost">{activity.costText}</span>
            <span className="fw-cat">
              <span>{activity.categoryIcon}</span>
              <span>{activity.category}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {onViewOnMap && (
              <button
                type="button"
                className="fw-map-btn"
                id={`btn-map-${activity.id}`}
                aria-label={`Ver ${activity.placeName || activity.title} en mapa`}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOnMap(activity);
                }}
              >
                <MapPin size={13} className="shrink-0 text-[#4A7C59]" />
                <span>Ver en mapa</span>
              </button>
            )}
            <button
              type="button"
              className="fw-kebab"
              aria-label="Opciones de actividad"
              id={`kebab-${activity.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu(activity, e);
              }}
            >
              &#8942;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
