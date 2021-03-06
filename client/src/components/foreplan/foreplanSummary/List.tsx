import { AnimatePresence, motion } from "framer-motion";
import { map, truncate } from "lodash";
import React, { FC, memo, useContext } from "react";
import { IoMdCloseCircleOutline } from "react-icons/io";

import { Box, Flex, Text, Tooltip } from "@chakra-ui/core";

import { ICourse } from "../../../../../interfaces";
import { ConfigContext } from "../../../context/Config";
import {
  ForeplanActiveStore,
  ICreditsNumber,
} from "../../../context/ForeplanContext";
import { track } from "../../../context/Tracking";
import { width100percent } from "../../../utils/cssConstants";

const ForeplanContentRowListItem: FC<
  Pick<ICourse, "code" | "name"> & ICreditsNumber
> = memo(({ code, name, credits }) => {
  const config = useContext(ConfigContext);
  const shouldTruncate =
    name.length > config.FOREPLAN_SUMMARY_LIST_NAME_TRUNCATE_LENGTH;

  return (
    <>
      <Flex
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        color={config.FOREPLAN_SUMMARY_LIST_TEXT_COLOR}
        backgroundColor={config.FOREPLAN_SUMMARY_LIST_BACKGROUND_COLOR}
        borderRadius={config.FOREPLAN_SUMMARY_LIST_BORDER_RADIUS}
        p={config.FOREPLAN_SUMMARY_LIST_ROW_PADDING}
        m={config.FOREPLAN_SUMMARY_LIST_ROW_MARGIN}
      >
        <Text
          pl={config.FOREPLAN_SUMMARY_LIST_CODE_TEXT_PADDING}
          pt={config.FOREPLAN_SUMMARY_LIST_CODE_TEXT_PADDING}
          pb={config.FOREPLAN_SUMMARY_LIST_CODE_TEXT_PADDING}
          m={0}
          textAlign="start"
          width={config.FOREPLAN_SUMMARY_LIST_CODE_WIDTH}
        >
          {code}
        </Text>
        {shouldTruncate ? (
          <Tooltip label={name} aria-label={name} zIndex={1000}>
            <Text
              m={0}
              textAlign="start"
              width={config.FOREPLAN_SUMMARY_LIST_NAME_WIDTH}
              cursor={shouldTruncate ? "help" : undefined}
            >
              {truncate(name, {
                length: config.FOREPLAN_SUMMARY_LIST_NAME_TRUNCATE_LENGTH,
              })}
            </Text>
          </Tooltip>
        ) : (
          <Text
            m={0}
            textAlign="start"
            width={config.FOREPLAN_SUMMARY_LIST_NAME_WIDTH}
            cursor={shouldTruncate ? "help" : undefined}
          >
            {truncate(name, {
              length: config.FOREPLAN_SUMMARY_LIST_NAME_TRUNCATE_LENGTH,
            })}
          </Text>
        )}

        <Text justifySelf="flex-end" textAlign="end" m={0}>
          {config.CREDITS_LABEL.toLowerCase().slice(0, 4)}: <b>{credits}</b>
        </Text>
        <Box
          as={IoMdCloseCircleOutline}
          size={config.FOREPLAN_SUMMARY_LIST_REMOVE_COURSE_ICON_SIZE}
          verticalAlign="middle"
          cursor="pointer"
          onClick={() => {
            track({
              action: "click",
              effect: "remove_course_foreplan",
              target: `foreplan_${code}_remove_icon_list_row`,
            });
            ForeplanActiveStore.actions.removeCourseForeplan(code);
          }}
        />
      </Flex>
    </>
  );
});

const ForeplanContentRowList: FC = memo(() => {
  const foreplanCourses = ForeplanActiveStore.hooks.useForeplanCourses();

  return (
    <AnimatePresence>
      {map(foreplanCourses, ({ name, credits }, course) => {
        return (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
            }}
            key={course}
            css={width100percent}
          >
            <ForeplanContentRowListItem
              code={course}
              name={name}
              credits={credits}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
});

export default ForeplanContentRowList;
