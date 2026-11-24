import React from 'react';
import {Composition} from 'remotion';
import {DURATION, PlaneVsTrain} from './Video';
import {FPS} from './ui';

export const Root: React.FC = () => (
  <Composition id="PlaneVsTrain" component={PlaneVsTrain} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1920} />
);
