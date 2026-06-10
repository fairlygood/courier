import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  size?: 'toolbar' | 'full';
  style?: any;
}

export default function Logo({ size = 'full', style }: Props) {
  const fontSize = size === 'toolbar' ? 28 : 64;
  return (
    <Text style={[styles.logo, { fontSize }, style]}>Courier</Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: 'MomoSignature-Regular',
    letterSpacing: 2,
    color: '#111',
    textAlign: 'center',
  },
});