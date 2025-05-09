/**
 * Gnosis Protocol v2 interaction data.
 */
export interface Interaction<BigIntish = unknown, Bytes = unknown> {
  /**
   * Address of the smart contract to be called in this interaction.
   */
  target: string
  /**
   * Call value in wei for the interaction, allowing Ether to be sent.
   */
  value: BigIntish
  /**
   * Call data used in the interaction with a smart contract.
   */
  callData: Bytes
}

export type InteractionLike<BigIntish, Bytes> = Pick<Interaction<BigIntish, Bytes>, 'target'> &
  Partial<Interaction<BigIntish, Bytes>>

/**
 * Normalizes interaction data so that it is ready to be be ABI encoded.
 *
 * @param interaction The interaction to normalize.
 * @return The normalized interaction.
 */
export function normalizeInteraction<BigIntish, Bytes>(
  interaction: InteractionLike<BigIntish, Bytes>,
): Interaction<BigIntish, Bytes> {
  return {
    value: 0 as BigIntish,
    callData: '0x' as Bytes,
    ...interaction,
  }
}

/**
 * Normalizes data for many interactions so that they can be ABI encoded. This
 * calls [`normalizeInteraction`] for each interaction.
 *
 * @param interactions The interactions to normalize.
 * @return The normalized interactions.
 */
export function normalizeInteractions<BigIntish, Bytes>(
  interactions: InteractionLike<BigIntish, Bytes>[],
): Interaction[] {
  return interactions.map(normalizeInteraction)
}
