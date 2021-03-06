import { toInteger } from "lodash";
import React, { FC, memo, useContext } from "react";
import { useForm } from "react-hook-form";

import {
  Box,
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/core";

import {
  FeedbackQuestionType,
  OPTIONS_FEEDBACK_SPLIT_CHAR,
} from "../../../constants";
import { ConfigContext } from "../../context/Config";
import {
  useAnswerFeedbackFormMutation,
  useUnansweredFormQuery,
} from "../../graphql";

export interface IDisclosure {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}

export const Feedback: FC<{
  children?: FC<IDisclosure>;
}> = memo(({ children: Children }) => {
  const { data, loading, refetch } = useUnansweredFormQuery({
    notifyOnNetworkStatusChange: true,
  });
  const [answerFeedback] = useAnswerFeedbackFormMutation();
  const modalDisclosure = useDisclosure(false);
  const config = useContext(ConfigContext);
  const { register, handleSubmit, errors, watch } = useForm();

  if (loading || !data?.unansweredForm) {
    return null;
  }

  const { id, name, questions } = data.unansweredForm;

  return (
    <>
      {Children && <Children {...modalDisclosure} />}

      <Modal
        {...modalDisclosure}
        preserveScrollBarGap
        scrollBehavior="inside"
        blockScrollOnMount
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{name}</ModalHeader>

          <ModalCloseButton />

          <ModalBody>
            <form
              onSubmit={handleSubmit(async (data) => {
                await answerFeedback({
                  variables: {
                    answer: {
                      form: id,
                      questions: Object.entries(data).map(
                        ([questionId, questionAnswer]) => {
                          const question = toInteger(questionId);
                          let answer: string = questionAnswer;
                          if (Array.isArray(questionAnswer)) {
                            answer = questionAnswer
                              .reduce<number[]>((acum, checked, optionId) => {
                                if (checked) {
                                  acum.push(optionId);
                                }
                                return acum;
                              }, [])
                              .join(OPTIONS_FEEDBACK_SPLIT_CHAR);
                          }
                          return {
                            question,
                            answer,
                          };
                        }
                      ),
                    },
                  },
                  optimisticResponse: {
                    answerFeedbackForm: true,
                  },
                });
                await refetch();
              })}
            >
              <Stack>
                {questions.map((questionValue) => {
                  return (
                    <Box key={questionValue.id} mt="10px" mb="10px" p="1px">
                      <Text>{questionValue.question}</Text>
                      {(() => {
                        const questionId = questionValue.id.toString();

                        switch (questionValue.type) {
                          case FeedbackQuestionType.OpenText: {
                            return (
                              <Input
                                name={questionId}
                                ref={register({
                                  required: {
                                    value: true,
                                    message:
                                      config.FEEDBACK_OPEN_TEXT_REQUIRED_ERROR_MESSAGE,
                                  },
                                })}
                              />
                            );
                          }
                          case FeedbackQuestionType.SingleAnswer: {
                            return (
                              <RadioGroup name={questionId} key={questionId}>
                                {questionValue.options.map(
                                  (optionValue, index) => {
                                    return (
                                      <Radio
                                        key={index}
                                        value={optionValue.value.toString()}
                                        ref={register({
                                          required: {
                                            value: true,
                                            message:
                                              config.FEEDBACK_SINGLE_ANSWER_REQUIRED_ERROR_MESSAGE,
                                          },
                                        })}
                                        lineHeight={0}
                                      >
                                        {optionValue.text}
                                      </Radio>
                                    );
                                  }
                                )}
                              </RadioGroup>
                            );
                          }
                          case FeedbackQuestionType.MultipleAnswer: {
                            return (
                              <Stack>
                                {questionValue.options.map((optionValue) => {
                                  return (
                                    <Checkbox
                                      className="checkbox"
                                      name={`${questionId}.${optionValue.value}`}
                                      key={optionValue.value}
                                      lineHeight={0}
                                      ref={register({
                                        validate: (checked: boolean) => {
                                          if (checked) {
                                            return true;
                                          }

                                          const checkedValues: boolean[] = watch(
                                            questionId,
                                            [] as any
                                          );
                                          return (
                                            checkedValues.some((v) => v) ||
                                            config.FEEDBACK_MULTIPLE_ANSWER_REQUIRED_ERROR_MESSAGE
                                          );
                                        },
                                      })}
                                    >
                                      {optionValue.text}
                                    </Checkbox>
                                  );
                                })}
                              </Stack>
                            );
                          }
                          default:
                            return null;
                        }
                      })()}

                      {(() => {
                        const error = errors[questionValue.id];
                        if (!error) return null;

                        return Array.isArray(error) ? (
                          <Text>{error[1]?.message}</Text>
                        ) : (
                          <Text>{error.message}</Text>
                        );
                      })()}
                    </Box>
                  );
                })}

                <Button type="submit">
                  {config.FEEDBACK_SUBMIT_BUTTON_LABEL_TEXT}
                </Button>
              </Stack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
});
